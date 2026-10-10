export type AuthState = { message: string; error: boolean };
export const emptyAuthState: AuthState = { message: '', error: false };
export function authMessage(code?: string) {
  switch (code) {
    case 'invalid_credentials': return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    case 'email_not_confirmed': return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ';
    case 'weak_password': return 'รหัสผ่านยังไม่ปลอดภัยพอ กรุณาใช้รหัสผ่านที่ยาวและเดายากขึ้น';
    case 'over_request_rate_limit': case 'over_email_send_rate_limit': return 'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
    case 'user_already_exists': return 'สมัครไม่สำเร็จ หากมีบัญชีแล้วให้เข้าสู่ระบบ';
    default: return 'ติดต่อระบบบัญชีไม่สำเร็จ กรุณาตรวจการตั้งค่าและลองอีกครั้ง';
  }
}
