# Contributing to obsidian-gcal-sync

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

1. Fork and clone the repository
2. Install Bun (recommended via mise or direct install from bun.sh)
3. Install dependencies: `bun install`

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Format code: `bun run format`
4. Lint code: `bun run lint`
5. Run tests: `bun test`
6. Type check: `bun run typecheck`
7. Build plugin: `bun run build`

## Testing

- Unit tests: `bun test`
- With coverage: `bun test --coverage`
- All checks: `bun run typecheck && bun test`

## Code Style

- We use Prettier with default settings
- We use oxlint for linting
- All code must be formatted and linted before committing
- Functional programming patterns preferred
- Hoisted conditionals for readability

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Create a pull request with a clear description
4. Link any related issues

## Issue Reporting

When reporting issues, please include:

- Obsidian version
- Plugin version
- Operating system
- Steps to reproduce
- Error messages (check Developer Console)

## Questions?

Feel free to open an issue for questions or join discussions in existing issues.
