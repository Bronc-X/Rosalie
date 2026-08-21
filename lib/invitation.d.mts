export type InvitationState = {
  choice: 'pending' | 'yes';
  noCount: number;
  message: string;
  reason: string | null;
};

export const INITIAL_INVITATION: Readonly<InvitationState>;

export function respondToInvitation(
  current: InvitationState,
  answer: 'yes' | 'no',
): InvitationState;
