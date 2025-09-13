# Claude Code Development Guidelines

This document contains best practices and guidelines learned from collaborative development with Claude Code.

## Quality Assurance Checklist

Before committing any changes, ensure:

- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Lint checks pass (`npm run lint`)
- [ ] Changes are isolated to intended scope
- [ ] Manual testing with real data completed

## Workflow Best Practices

### Git Workflow
- Use descriptive branch names (e.g., `fix/hackernews-comment-html-entities`)
- Write clear, detailed commit messages
- Create comprehensive PR descriptions with problem/solution/testing sections

### Code Changes
- Make surgical, focused changes
- Ensure platform-specific fixes don't affect other platforms
- Always verify changes don't impact unrelated functionality

### Testing
- Run the full quality checklist before pushing
- Test with real data, not just mock data
- Verify edge cases and error handling

## Common Commands

```bash
# Run all quality checks
npm test && npx tsc --noEmit && npm run lint

# Start development server
npm run dev

# Create and push feature branch
git checkout -b feature/your-feature-name
git push -u origin feature/your-feature-name

# Create PR with GitHub CLI
gh pr create --title "Your PR title" --body "Your PR description"
```

## Notes

- When fixing issues for external APIs (V2EX, Reddit, Hacker News), always ensure changes are isolated to the specific platform
- HTML entities from external APIs should be decoded for proper display
- Always protect production data files from test pollution