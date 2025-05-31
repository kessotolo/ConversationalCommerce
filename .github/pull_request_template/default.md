# Pull Request Template

## Description

Please include a summary of the changes. Please also include relevant motivation and context.

## Type of change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Architecture refactoring
- [ ] Documentation update

## Architecture Compliance Checklist

- [ ] I have verified my changes comply with the modular monolith architecture using `npm run verify:architecture`
- [ ] All imports follow direct module import patterns (no bridge files used)
- [ ] New code respects module boundaries as defined in the Architecture documentation
- [ ] If new types were added, they are in the appropriate module, not in centralized type files
- [ ] File names match the import statements and follow the established casing conventions

## Testing Checklist

- [ ] I have added appropriate tests
- [ ] All existing tests pass
- [ ] TypeScript compiles without errors (`npm run tsc`)
- [ ] Linting passes (`npm run lint`)

## Documentation Checklist

- [ ] I have updated the documentation to reflect my changes (if applicable)
- [ ] If architectural decisions were made, I've updated or created an ADR
