// types/google.d.ts
export interface GoogleCredentialResponse {
  credential: string;
  clientId?: string;
  select_by?: string;
}

export interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  hosted_domain?: string;
  ux_mode?: 'popup' | 'redirect';
}

export interface GoogleButtonConfig {
  type?: 'standard';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number | string;
  locale?: string;
  click_listener?: () => void;
}

export interface GoogleAccountsId {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (element: HTMLElement, config: GoogleButtonConfig) => void;
  prompt: (notification?: any) => void;
}

export interface GoogleAccounts {
  id: GoogleAccountsId;
}

export interface GoogleWindow {
  google: {
    accounts: GoogleAccounts;
  };
}

declare global {
  interface Window extends GoogleWindow {}
}