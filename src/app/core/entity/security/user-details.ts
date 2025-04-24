export interface Autority {
  authority: string;
}
export interface UserDetails {
  username: string;
  password: string | null;
  authorities: Autority[];
  enabled: boolean;
}
