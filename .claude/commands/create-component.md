# Create Component Command

Generate a new React component with tests and stories using autonomous agent workflow.

## Workflow

1. **Component Specification**
   - Component name (PascalCase)
   - Props interface
   - Location: `src/components/{ComponentName}.tsx`

2. **Automated Steps** (via Task tool)

   a. **Invoke `frontend-developer` agent**
      - Generate React component following project patterns:
        - Functional component with TypeScript
        - Tailwind CSS for styling
        - shadcn/ui primitives if applicable
        - Proper prop types with JSDoc
      - Output: `src/components/{ComponentName}.tsx`

   b. **Invoke `test-automator` agent**
      - Generate test file with:
        - Unit tests for component rendering
        - Props validation tests
        - User interaction tests (if applicable)
        - Accessibility tests
      - Output: `src/components/{ComponentName}.test.tsx`

   c. **Invoke `typescript-pro` agent**
      - Run type check: `tsc --noEmit`
      - Verify no type errors
      - Suggest improvements if needed

   d. **Invoke `code-reviewer-pro` agent** (Quality Gate)
      - Review component code quality
      - Check: naming, patterns, best practices
      - Approve or suggest improvements

3. **Auto-commit** (if approved)
   - Stage all generated files
   - Commit with message: `feat: add {ComponentName} component`
   - Run pre-commit hook (lint, type-check, tests)

## Usage

```bash
/create-component Button
```

With props specification:
```bash
/create-component Button variant:primary|secondary size:sm|md|lg onClick:function
```

## Generated Files

```
src/components/
├── Button.tsx              # Component implementation
└── Button.test.tsx         # Test suite
```

## Component Template

```tsx
import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded font-medium transition-colors',
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        size === 'sm' && 'px-3 py-1 text-sm',
        size === 'md' && 'px-4 py-2',
        size === 'lg' && 'px-6 py-3 text-lg'
      )}
    >
      {children}
    </button>
  );
}
```

## Test Template

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('applies variant styles correctly', () => {
    const { container } = render(<Button variant="secondary">Button</Button>);
    expect(container.firstChild).toHaveClass('bg-gray-200');
  });
});
```

## Success Criteria

✅ Component follows project patterns
✅ TypeScript types are correct
✅ Tests cover key functionality
✅ Code reviewer approves
✅ Pre-commit hook passes
✅ Auto-committed to branch

## Options

**Skip tests** (not recommended):
```bash
/create-component Button --no-tests
```

**Skip auto-commit**:
```bash
/create-component Button --no-commit
```

**Specify location**:
```bash
/create-component Button --path src/components/ui/
```

## Notes

- Component name must be PascalCase
- Props automatically typed with TypeScript
- Uses existing shadcn/ui patterns
- Integrated with project's Tailwind config
- Auto-imports added to component
- Tests use Vitest + Testing Library
