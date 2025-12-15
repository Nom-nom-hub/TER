/**
 * DotEnv Multiline Value Tests
 */

import {
  parseDotEnvWithMultiline,
  generateDotEnvWithMultiline,
  mergeDotEnvFiles,
  diffDotEnvFiles,
  DotEnvDiff,
} from '../src/adapters/dotenv-multiline';

describe('Multiline DotEnv Parsing', () => {
  describe('Heredoc Syntax', () => {
    test('parses heredoc with simple content', () => {
      const content = `
        CONFIG=<<EOF
        line 1
        line 2
        line 3
        EOF
      `;

      const result = parseDotEnvWithMultiline(content);
      expect(result.CONFIG).toBe('line 1\nline 2\nline 3');
    });

    test('parses heredoc with empty lines', () => {
      const content = `
        SCRIPT=<<EOF
        #!/bin/bash
        
        echo "hello"
        
        exit 0
        EOF
      `;

      const result = parseDotEnvWithMultiline(content);
      expect(result.SCRIPT).toContain('#!/bin/bash');
      expect(result.SCRIPT).toContain('echo "hello"');
      expect(result.SCRIPT).toContain('exit 0');
    });

    test('removes common indentation in heredoc', () => {
      const content = `
        JSON=<<EOF
          {
            "key": "value"
          }
        EOF
      `;

      const result = parseDotEnvWithMultiline(content, {
        preserveIndentation: false,
      });

      // Should remove common indentation
      expect(result.JSON).toContain('{');
      expect(result.JSON).toContain('"key": "value"');
    });

    test('preserves indentation when configured', () => {
      const content = `
        CODE=<<EOF
          indented
            more indented
        EOF
      `;

      const result = parseDotEnvWithMultiline(content, {
        preserveIndentation: true,
      });

      expect(result.CODE).toContain('  indented');
    });

    test('disables heredoc when configured', () => {
      const content = `FOO=<<EOF\nbar\nEOF`;

      const result = parseDotEnvWithMultiline(content, {
        allowHeredoc: false,
      });

      // Should not parse as heredoc, just a value
      expect(result.FOO).toContain('<<EOF');
    });
  });

  describe('Line Continuation', () => {
    test('continues lines with backslash', () => {
      const content = `
        LONG_VALUE=this is a very long \\
        value that continues \\
        on multiple lines
      `;

      const result = parseDotEnvWithMultiline(content);
      expect(result.LONG_VALUE).toBe(
        'this is a very long \nvalue that continues \non multiple lines'
      );
    });

    test('handles quoted continuation', () => {
      const content = `
        PATH="first/path" \\
        "second/path"
      `;

      const result = parseDotEnvWithMultiline(content);
      expect(result.PATH).toContain('first/path');
    });

    test('stops continuation at next key', () => {
      const content = `
        VALUE=continues \\
        still continues
        NEXT=new value
      `;

      const result = parseDotEnvWithMultiline(content);
      expect(result.VALUE).toContain('still continues');
      expect(result.NEXT).toBe('new value');
    });

    test('disables line continuation when configured', () => {
      const content = `FOO=bar\\`;

      const result = parseDotEnvWithMultiline(content, {
        allowLineContination: false,
      });

      // Value should end with backslash
      expect(result.FOO).toBe('bar\\');
    });

    test('stops continuation at comment', () => {
      const content = `
        VALUE=continues \\
        # This is a comment
        NEXT=value
      `;

      const result = parseDotEnvWithMultiline(content);
      expect(result.VALUE).toBe('continues ');
      expect(result.NEXT).toBe('value');
    });
  });

  describe('Quoted Values', () => {
    test('handles single-quoted multiline', () => {
      const content = `SINGLE='line 1
line 2
line 3'`;

      const result = parseDotEnvWithMultiline(content);
      expect(result.SINGLE).toContain('line 1');
      expect(result.SINGLE).toContain('line 2');
    });

    test('handles double-quoted multiline with escapes', () => {
      const content = `DOUBLE="line 1\\nline 2\\nline 3"`;

      const result = parseDotEnvWithMultiline(content);
      expect(result.DOUBLE).toContain('line 1');
      expect(result.DOUBLE).toContain('line 2');
    });

    test('unescapes quote content properly', () => {
      const content = `ESCAPED="He said \\"Hello\\""`;

      const result = parseDotEnvWithMultiline(content);
      expect(result.ESCAPED).toContain('He said "Hello"');
    });

    test('handles tab escapes', () => {
      const content = `TABS="col1\\tcol2\\tcol3"`;

      const result = parseDotEnvWithMultiline(content);
      expect(result.TABS).toContain('\t');
    });
  });

  describe('JSON Multiline', () => {
    test('parses multiline JSON with continuation', () => {
      const content = `
        CONFIG="{ \\
          \\"database\\": { \\
            \\"host\\": \\"localhost\\" \\
          } \\
        }"
      `;

      const result = parseDotEnvWithMultiline(content);
      expect(result.CONFIG).toContain('database');
      expect(result.CONFIG).toContain('host');
    });

    test('parses JSON in heredoc', () => {
      const content = `
        CONFIG=<<EOF
        {
          "key": "value",
          "nested": {
            "prop": "value"
          }
        }
        EOF
      `;

      const result = parseDotEnvWithMultiline(content);
      const parsed = JSON.parse(result.CONFIG);
      expect(parsed.key).toBe('value');
      expect(parsed.nested.prop).toBe('value');
    });
  });

  describe('Size Limits', () => {
    test('enforces max size limit', () => {
      const content = `HUGE=<<EOF
${'x'.repeat(2000)}
EOF`;

      expect(() => {
        parseDotEnvWithMultiline(content, { maxSize: 1000 });
      }).toThrow(/exceeds maximum size/);
    });

    test('allows unlimited size when maxSize is 0', () => {
      const content = `HUGE=<<EOF
${'x'.repeat(10000)}
EOF`;

      const result = parseDotEnvWithMultiline(content, { maxSize: 0 });
      expect(result.HUGE).toHaveLength(10000);
    });

    test('uses default 1MB limit', () => {
      const content = `NORMAL=<<EOF
${'x'.repeat(100)}
EOF`;

      // Should not throw with normal size
      const result = parseDotEnvWithMultiline(content);
      expect(result.NORMAL).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty heredoc', () => {
      const content = `EMPTY=<<EOF
EOF`;

      const result = parseDotEnvWithMultiline(content);
      expect(result.EMPTY).toBe('');
    });

    test('handles value with <<EOF inside', () => {
      const content = `NORMAL="value with <<EOF in it"`;

      const result = parseDotEnvWithMultiline(content);
      expect(result.NORMAL).toBe('value with <<EOF in it');
    });

    test('handles multiple multiline values', () => {
      const content = `
        FIRST=<<EOF
        first value
        EOF
        SECOND=<<DELIMITER
        second value
        DELIMITER
        THIRD=line1 \\
        line2
      `;

      const result = parseDotEnvWithMultiline(content);
      expect(result.FIRST).toBe('first value');
      expect(result.SECOND).toBe('second value');
      expect(result.THIRD).toContain('line1');
    });

    test('ignores comments between continuation', () => {
      const content = `
        VALUE=start
        # comment
        NEXT=value
      `;

      const result = parseDotEnvWithMultiline(content);
      expect(result.VALUE).toBe('start');
      expect(result.NEXT).toBe('value');
    });
  });
});

describe('Multiline DotEnv Generation', () => {
  test('generates simple values', () => {
    const values = {
      KEY1: 'value1',
      KEY2: 'value2',
    };

    const content = generateDotEnvWithMultiline(values);
    expect(content).toContain('KEY1=value1');
    expect(content).toContain('KEY2=value2');
  });

  test('quotes values with special characters', () => {
    const values = {
      WITH_SPACE: 'hello world',
      WITH_EQUAL: 'key=value',
      WITH_HASH: '#not a comment',
    };

    const content = generateDotEnvWithMultiline(values);
    expect(content).toContain('"');
  });

  test('uses heredoc for multiline values', () => {
    const values = {
      MULTILINE: 'line1\nline2\nline3',
    };

    const content = generateDotEnvWithMultiline(values, { useHeredoc: true });
    expect(content).toContain('<<EOF');
    expect(content).toContain('line1');
    expect(content).toContain('line2');
  });

  test('uses line continuation when heredoc is disabled', () => {
    const values = {
      MULTILINE: 'line1\nline2\nline3',
    };

    const content = generateDotEnvWithMultiline(values, { useHeredoc: false });
    expect(content).toContain('\\');
  });

  test('rejects invalid keys', () => {
    expect(() => {
      generateDotEnvWithMultiline({
        '123INVALID': 'value',
      });
    }).toThrow(/Invalid key/);
  });

  test('escapes special characters in values', () => {
    const values = {
      WITH_NEWLINE: 'line1\nline2',
      WITH_TAB: 'col1\tcol2',
      WITH_QUOTES: 'say "hello"',
    };

    const content = generateDotEnvWithMultiline(values, { useHeredoc: false });
    expect(content).toContain('\\n');
    expect(content).toContain('\\t');
    expect(content).toContain('\\"');
  });
});

describe('Merge and Diff', () => {
  test('merges multiple files with later values overriding', () => {
    const file1 = `KEY1=value1\nKEY2=value2`;
    const file2 = `KEY2=overridden\nKEY3=value3`;

    const result = mergeDotEnvFiles(file1, file2);
    expect(result.KEY1).toBe('value1');
    expect(result.KEY2).toBe('overridden');
    expect(result.KEY3).toBe('value3');
  });

  test('merges multiline values correctly', () => {
    const file1 = `CONFIG=<<EOF
line1
line2
EOF`;
    const file2 = `CONFIG=<<EOF
newline1
newline2
EOF`;

    const result = mergeDotEnvFiles(file1, file2);
    expect(result.CONFIG).toContain('newline1');
  });

  test('detects added keys in diff', () => {
    const oldContent = `KEY1=value1`;
    const newContent = `KEY1=value1\nKEY2=value2`;

    const diff = diffDotEnvFiles(oldContent, newContent);
    expect(diff.added.KEY2).toBe('value2');
    expect(Object.keys(diff.added)).toHaveLength(1);
  });

  test('detects removed keys in diff', () => {
    const oldContent = `KEY1=value1\nKEY2=value2`;
    const newContent = `KEY1=value1`;

    const diff = diffDotEnvFiles(oldContent, newContent);
    expect(diff.removed.KEY2).toBe('value2');
    expect(Object.keys(diff.removed)).toHaveLength(1);
  });

  test('detects modified values in diff', () => {
    const oldContent = `KEY1=oldvalue`;
    const newContent = `KEY1=newvalue`;

    const diff = diffDotEnvFiles(oldContent, newContent);
    expect(diff.modified.KEY1.old).toBe('oldvalue');
    expect(diff.modified.KEY1.new).toBe('newvalue');
  });

  test('detects unchanged values in diff', () => {
    const oldContent = `KEY1=value1\nKEY2=value2`;
    const newContent = `KEY1=value1\nKEY2=value2`;

    const diff = diffDotEnvFiles(oldContent, newContent);
    expect(diff.unchanged.KEY1).toBe('value1');
    expect(diff.unchanged.KEY2).toBe('value2');
    expect(Object.keys(diff.added)).toHaveLength(0);
    expect(Object.keys(diff.removed)).toHaveLength(0);
  });

  test('diffs multiline values correctly', () => {
    const oldContent = `CONFIG=<<EOF
old
EOF`;
    const newContent = `CONFIG=<<EOF
new
EOF`;

    const diff = diffDotEnvFiles(oldContent, newContent);
    expect(diff.modified.CONFIG.old).toBe('old');
    expect(diff.modified.CONFIG.new).toBe('new');
  });
});

describe('Integration', () => {
  test('roundtrip: parse and generate with multiline', () => {
    const original = `
      SIMPLE=value
      MULTILINE=<<EOF
      line1
      line2
      EOF
      CONTINUATION=start \\
      continues
      QUOTED="quoted value"
    `;

    const parsed = parseDotEnvWithMultiline(original);
    const generated = generateDotEnvWithMultiline(parsed);
    const reparsed = parseDotEnvWithMultiline(generated);

    expect(reparsed.SIMPLE).toBe(parsed.SIMPLE);
    expect(reparsed.MULTILINE).toBe(parsed.MULTILINE);
    expect(reparsed.QUOTED).toBe(parsed.QUOTED);
  });

  test('handles real-world certificate content', () => {
    const content = `
      CERTIFICATE=<<EOF
      -----BEGIN CERTIFICATE-----
      MIIDXTCCAkWgAwIBAgIJAJC1giwhAZAOMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
      BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
      -----END CERTIFICATE-----
      EOF
    `;

    const result = parseDotEnvWithMultiline(content);
    expect(result.CERTIFICATE).toContain('BEGIN CERTIFICATE');
    expect(result.CERTIFICATE).toContain('END CERTIFICATE');
  });

  test('handles real-world SQL content', () => {
    const content = `
      MIGRATION=<<EOF
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      EOF
    `;

    const result = parseDotEnvWithMultiline(content);
    expect(result.MIGRATION).toContain('CREATE TABLE');
    expect(result.MIGRATION).toContain('users');
  });

  test('handles real-world shell script', () => {
    const content = `
      DEPLOY_SCRIPT=<<EOF
      #!/bin/bash
      set -e
      
      echo "Deploying..."
      docker pull app:latest
      docker run app:latest
      
      echo "Done!"
      EOF
    `;

    const result = parseDotEnvWithMultiline(content);
    expect(result.DEPLOY_SCRIPT).toContain('#!/bin/bash');
    expect(result.DEPLOY_SCRIPT).toContain('docker pull');
    expect(result.DEPLOY_SCRIPT).toContain('Done!');
  });
});
