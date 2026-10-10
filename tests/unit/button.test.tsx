import Link from 'next/link';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Button } from '../../src/components/ui/button';
it('supports keyboard interaction and semantic link composition', async () => {
  const onClick = vi.fn();
  render(
    <>
      <Button onClick={onClick}>Continue</Button>
      <Button asChild>
        <Link href="/en">Home</Link>
      </Button>
    </>,
  );
  await userEvent.tab();
  expect(screen.getByRole('button')).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(onClick).toHaveBeenCalledOnce();
  expect(screen.getByRole('link')).toHaveAttribute('href', '/en');
});
