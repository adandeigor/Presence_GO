import { UserInfoType } from "@/lib/session/session-options";

export interface AuthResult {
    user: UserInfoType;
    session: {
      token: string;
      expires: Date;
    };
  }