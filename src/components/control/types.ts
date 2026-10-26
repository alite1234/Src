export type ControlSend = (
  label: string,
  url: string,
  body: unknown,
) => Promise<boolean>;
