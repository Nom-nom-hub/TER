import {
  Validators,
  TypeValidator,
  SchemaValidators,
} from '../src/core/validators';

describe('Validators', () => {
  describe('email', () => {
    it('validates valid emails', () => {
      const validator = Validators.email();
      expect(() => validator('test@example.com')).not.toThrow();
    });

    it('rejects invalid emails', () => {
      const validator = Validators.email();
      expect(() => validator('invalid')).toThrow();
    });
  });

  describe('urlFormat', () => {
    it('validates valid URLs', () => {
      const validator = Validators.urlFormat();
      expect(() => validator('https://example.com')).not.toThrow();
    });

    it('rejects invalid URLs', () => {
      const validator = Validators.urlFormat();
      expect(() => validator('not a url')).toThrow();
    });
  });

  describe('minLength', () => {
    it('accepts values >= min length', () => {
      const validator = Validators.minLength(3);
      expect(() => validator('hello')).not.toThrow();
    });

    it('rejects values < min length', () => {
      const validator = Validators.minLength(5);
      expect(() => validator('hi')).toThrow();
    });
  });

  describe('maxLength', () => {
    it('accepts values <= max length', () => {
      const validator = Validators.maxLength(5);
      expect(() => validator('hi')).not.toThrow();
    });

    it('rejects values > max length', () => {
      const validator = Validators.maxLength(3);
      expect(() => validator('hello')).toThrow();
    });
  });

  describe('pattern', () => {
    it('validates matching patterns', () => {
      const validator = Validators.pattern(/^\d+$/);
      expect(() => validator('12345')).not.toThrow();
    });

    it('rejects non-matching patterns', () => {
      const validator = Validators.pattern(/^\d+$/);
      expect(() => validator('abc')).toThrow();
    });
  });

  describe('range', () => {
    it('accepts values in range', () => {
      const validator = Validators.range(0, 100);
      expect(() => validator(50)).not.toThrow();
    });

    it('rejects values outside range', () => {
      const validator = Validators.range(0, 100);
      expect(() => validator(150)).toThrow();
    });
  });

  describe('custom', () => {
    it('executes custom predicate', () => {
      const validator = Validators.custom(
        (v) => (v as string).startsWith('user_'),
        'Must start with user_'
      );
      expect(() => validator('user_123')).not.toThrow();
      expect(() => validator('admin_123')).toThrow();
    });
  });

  describe('oneOf', () => {
    it('accepts allowed values', () => {
      const validator = Validators.oneOf(['dev', 'staging', 'prod']);
      expect(() => validator('dev')).not.toThrow();
    });

    it('rejects disallowed values', () => {
      const validator = Validators.oneOf(['dev', 'staging', 'prod']);
      expect(() => validator('test')).toThrow();
    });
  });

  describe('unique', () => {
    it('accepts unique values', () => {
      const existing = new Set(['user1', 'user2']);
      const validator = Validators.unique(existing);
      expect(() => validator('user3')).not.toThrow();
    });

    it('rejects duplicate values', () => {
      const existing = new Set(['user1', 'user2']);
      const validator = Validators.unique(existing);
      expect(() => validator('user1')).toThrow();
    });
  });
});

describe('TypeValidator', () => {
  it('chains multiple validators', () => {
    const validator = new TypeValidator()
      .addValidator(Validators.minLength(3))
      .addValidator(Validators.maxLength(10))
      .addValidator(Validators.pattern(/^[a-z]+$/));

    expect(() => validator.validateSync('hello')).not.toThrow();
    expect(() => validator.validateSync('ab')).toThrow();
    expect(() => validator.validateSync('verylongvalue')).toThrow();
    expect(() => validator.validateSync('Hello')).toThrow();
  });

  it('validates async validators', async () => {
    const asyncValidator = async (value: unknown) => {
      if ((value as string).length < 5) {
        throw new Error('Too short');
      }
    };

    const validator = new TypeValidator().addValidator(asyncValidator);
    await expect(validator.validate('hello')).resolves.toBeUndefined();
    await expect(validator.validate('hi')).rejects.toThrow();
  });

  it('rejects async validators in sync context', () => {
    const asyncValidator = async (value: unknown) => {
      // async function
    };

    const validator = new TypeValidator().addValidator(asyncValidator);
    expect(() => validator.validateSync('test')).toThrow();
  });
});

describe('SchemaValidators', () => {
  it('validates field-level validators', async () => {
    const validators = new SchemaValidators();
    validators.addFieldValidator('email', Validators.email());
    validators.addFieldValidator('age', Validators.range(0, 150));

    const values = { email: 'test@example.com', age: 30 };
    const errors = await validators.validateAll(values);
    expect(errors.size).toBe(0);
  });

  it('collects field errors', async () => {
    const validators = new SchemaValidators();
    validators.addFieldValidator('email', Validators.email());
    validators.addFieldValidator('age', Validators.range(0, 150));

    const values = { email: 'invalid', age: 200 };
    const errors = await validators.validateAll(values);
    expect(errors.has('email')).toBe(true);
    expect(errors.has('age')).toBe(true);
  });

  it('validates cross-field constraints', async () => {
    const validators = new SchemaValidators();
    validators.addCrossFieldValidator((values) => {
      if (values.password !== values.confirmPassword) {
        throw new Error('Passwords do not match');
      }
    });

    const validValues = {
      password: 'secret123',
      confirmPassword: 'secret123',
    };
    let errors = await validators.validateAll(validValues);
    expect(errors.size).toBe(0);

    const invalidValues = {
      password: 'secret123',
      confirmPassword: 'different',
    };
    errors = await validators.validateAll(invalidValues);
    expect(errors.has('__cross__')).toBe(true);
  });

  it('supports multiple validators per field', async () => {
    const validators = new SchemaValidators();
    validators
      .addFieldValidator('username', Validators.minLength(3))
      .addFieldValidator('username', Validators.maxLength(20))
      .addFieldValidator('username', Validators.pattern(/^[a-z0-9_]+$/));

    const validValues = { username: 'user_123' };
    let errors = await validators.validateAll(validValues);
    expect(errors.size).toBe(0);

    const invalidValues = { username: 'ab' };
    errors = await validators.validateAll(invalidValues);
    expect(errors.has('username')).toBe(true);
  });

  it('supports async field validators', async () => {
    const validators = new SchemaValidators();
    validators.addFieldValidator('username', async (value) => {
      // Simulate database check
      const reserved = ['admin', 'root', 'system'];
      if (reserved.includes(value as string)) {
        throw new Error('Username is reserved');
      }
    });

    const values = { username: 'user123' };
    let errors = await validators.validateAll(values);
    expect(errors.size).toBe(0);

    const invalidValues = { username: 'admin' };
    errors = await validators.validateAll(invalidValues);
    expect(errors.has('username')).toBe(true);
  });
});

describe('Async validators', () => {
  it('validates with async database checks', async () => {
    const validator = Validators.asyncDatabase(
      async (email) => {
        // Simulate database lookup
        return email !== 'taken@example.com';
      },
      'Email already registered'
    );

    await expect(validator('new@example.com')).resolves.toBeUndefined();
    await expect(validator('taken@example.com')).rejects.toThrow();
  });

  it('validates with custom async checks', async () => {
    const validator = Validators.async(
      async (username) => {
        // Simulate API check
        return (username as string).length > 3;
      },
      'Username too short'
    );

    await expect(validator('user123')).resolves.toBeUndefined();
    await expect(validator('ab')).rejects.toThrow();
  });
});

describe('Validator combinations', () => {
  it('combines multiple validator types', async () => {
    const validators = new SchemaValidators();

    // Email field: format + async uniqueness
    validators.addFieldValidator('email', Validators.email());
    validators.addFieldValidator('email', async (value) => {
      const taken = new Set(['admin@example.com', 'test@example.com']);
      if (taken.has(value as string)) {
        throw new Error('Email already registered');
      }
    });

    // Age field: range
    validators.addFieldValidator('age', Validators.range(18, 120));

    // Cross-field: passwords match
    validators.addCrossFieldValidator((values) => {
      if (values.password !== values.confirmPassword) {
        throw new Error('Passwords do not match');
      }
    });

    const validValues = {
      email: 'new@example.com',
      age: 25,
      password: 'secure123',
      confirmPassword: 'secure123',
    };
    let errors = await validators.validateAll(validValues);
    expect(errors.size).toBe(0);

    const invalidValues = {
      email: 'invalid-email',
      age: 15,
      password: 'secure123',
      confirmPassword: 'different',
    };
    errors = await validators.validateAll(invalidValues);
    expect(errors.size).toBeGreaterThan(0);
    expect(errors.has('email')).toBe(true);
    expect(errors.has('age')).toBe(true);
    expect(errors.has('__cross__')).toBe(true);
  });
});
