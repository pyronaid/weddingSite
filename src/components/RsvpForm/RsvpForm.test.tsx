import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RsvpSubmissionError, type RsvpRepository } from '../../services/rsvp';
import { RsvpForm } from './RsvpForm';

function setup(repository: RsvpRepository) {
  const user = userEvent.setup();
  render(<RsvpForm repository={repository} maxGuests={4} />);
  return user;
}

describe('RsvpForm', () => {
  it('does not submit and shows errors when required fields are empty', async () => {
    const submit = vi.fn();
    const user = setup({ submit });

    await user.click(screen.getByRole('button', { name: /send confirmation/i }));

    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText(/tell us your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveFocus();
  });

  it('submits normalized data and shows a thank-you message', async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    const user = setup({ submit });

    await user.type(screen.getByLabelText(/full name/i), '  Anna Verdi ');
    await user.type(screen.getByLabelText(/e-mail/i), 'Anna@Example.com');
    await user.selectOptions(screen.getByLabelText(/number of guests/i), '2');
    await user.click(screen.getByRole('button', { name: /send confirmation/i }));

    expect(submit).toHaveBeenCalledWith({
      fullName: 'Anna Verdi',
      email: 'anna@example.com',
      attending: 'yes',
      guests: 2,
      dietaryNotes: '',
      message: '',
    });
    expect(await screen.findByText(/thank you, anna/i)).toBeInTheDocument();
  });

  it('hides guest fields when declining', async () => {
    const user = setup({ submit: vi.fn() });
    await user.click(screen.getByLabelText(/regretfully decline/i));
    expect(screen.queryByLabelText(/number of guests/i)).not.toBeInTheDocument();
  });

  it('shows the repository error and lets the user retry', async () => {
    const submit = vi.fn().mockRejectedValue(new RsvpSubmissionError('Backend down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = setup({ submit });

    await user.type(screen.getByLabelText(/full name/i), 'Anna');
    await user.type(screen.getByLabelText(/e-mail/i), 'anna@example.com');
    await user.click(screen.getByRole('button', { name: /send confirmation/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Backend down');
    expect(screen.getByRole('button', { name: /send confirmation/i })).toBeEnabled();
  });
});
