from setuptools import setup, find_packages

setup(
    name="ter-sdk",
    version="0.1.0",
    description="Typed Environment Runtime - Python SDK",
    author="",
    license="MIT",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[],
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-cov>=4.0",
            "black>=22.0",
            "mypy>=0.990",
            "flake8>=4.0",
        ],
    },
)
