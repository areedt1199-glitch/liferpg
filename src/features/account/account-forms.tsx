"use client";
import { useActionState, useEffect, useState, type FormEvent } from 'react';
import { authenticate, signOut, updateName } from './actions';
import { emptyAuthState } from './messages';
import { clearAccountView, reloadProgress, notifyAccountChanged } from '@/features/journey/progress-store';
export function AccountForms({email,characterName}:{email:string|null;characterName:string}) {
 const [authState,authAction,authPending]=useActionState(authenticate,emptyAuthState);
 const [logoutState,logoutAction,logoutPending]=useActionState(signOut,emptyAuthState);
 const [nameState,nameAction,namePending]=useActionState(updateName,emptyAuthState);
 const [signup,setSignup]=useState(false);
 const [showPassword,setShowPassword]=useState(false);
 const [showConfirmation,setShowConfirmation]=useState(false);
 const [formError,setFormError]=useState('');
 const [submittedMode,setSubmittedMode]=useState<boolean|null>(null);
 function submitAuth(event:FormEvent<HTMLFormElement>){
  const form=new FormData(event.currentTarget);
  if(signup && form.get('password')!==form.get('confirmPassword')){
   event.preventDefault();setFormError('รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจอีกครั้ง');
   event.currentTarget.querySelector<HTMLInputElement>('[name="confirmPassword"]')?.focus();return;
  }
  setFormError('');setSubmittedMode(signup);changingIdentity();
 }
 useEffect(()=>{clearAccountView();notifyAccountChanged();void reloadProgress();},[email]);
 useEffect(()=>{if(nameState.message&&!nameState.error){void reloadProgress();notifyAccountChanged();}},[nameState]);
 function changingIdentity(){clearAccountView();notifyAccountChanged();}
 if(email) return <div className="account-forms"><p>เข้าสู่ระบบแล้ว · {email}</p><form action={nameAction}><label htmlFor="characterName">ชื่อตัวละคร</label><input id="characterName" name="characterName" defaultValue={characterName} minLength={1} maxLength={40} required autoComplete="nickname" /><button className="primary-link" disabled={namePending}>{namePending?'กำลังบันทึก…':'บันทึกชื่อ'}</button>{nameState.message&&<p role={nameState.error?'alert':'status'}>{nameState.message}</p>}</form><form action={logoutAction} onSubmit={changingIdentity}><button className="text-link" disabled={logoutPending}>{logoutPending?'กำลังออกจากระบบ…':'ออกจากระบบ'}</button>{logoutState.message&&<p role="alert">{logoutState.message}</p>}</form></div>;
 return <div className="account-forms">
  <div className="auth-switch" role="group" aria-label="เลือกแบบฟอร์มบัญชี">
   <button type="button" aria-pressed={!signup} disabled={authPending} onClick={()=>{setSignup(false);setFormError('');setShowPassword(false);setShowConfirmation(false);}}>เข้าสู่ระบบ</button>
   <button type="button" aria-pressed={signup} disabled={authPending} onClick={()=>{setSignup(true);setFormError('');setShowPassword(false);setShowConfirmation(false);}}>สมัครสมาชิก</button>
  </div>
  <h3 className="auth-heading">{signup?'เริ่มการผจญภัยของคุณ':'ยินดีต้อนรับกลับ'}</h3>
  <p className="muted">{signup?'สร้างบัญชีเพื่อเก็บความก้าวหน้าและกลับมาทำเควสต์ต่อ':'เข้าสู่ระบบเพื่อเดินทางต่อจากที่ค้างไว้'}</p>
  <form key={signup?'signup':'login'} action={authAction} onSubmit={submitAuth} onChange={()=>setFormError('')}>
   <input type="hidden" name="action" value={signup?'signup':'login'}/>
   <label htmlFor="email">อีเมล</label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} required disabled={authPending}/>
   <label htmlFor="password">รหัสผ่าน</label><div className="password-field"><input id="password" name="password" type={showPassword?'text':'password'} autoComplete={signup?'new-password':'current-password'} minLength={8} maxLength={1024} required disabled={authPending} aria-describedby="password-help"/><button type="button" className="password-toggle" aria-controls="password" aria-pressed={showPassword} disabled={authPending} onClick={()=>setShowPassword(value=>!value)}>{showPassword?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'}</button></div>
   <p id="password-help" className="muted">ใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร</p>
   {signup&&<><label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</label><div className="password-field"><input id="confirmPassword" name="confirmPassword" type={showConfirmation?'text':'password'} autoComplete="new-password" minLength={8} maxLength={1024} required disabled={authPending} aria-invalid={!!formError} aria-describedby={formError?'password-error':undefined}/><button type="button" className="password-toggle" aria-controls="confirmPassword" aria-pressed={showConfirmation} disabled={authPending} onClick={()=>setShowConfirmation(value=>!value)}>{showConfirmation?'ซ่อนรหัสผ่านยืนยัน':'แสดงรหัสผ่านยืนยัน'}</button></div></>}
   {formError&&<p id="password-error" role="alert">{formError}</p>}
   <button className="primary-link auth-submit" disabled={authPending}>{authPending?'กำลังส่งคำขอ…':signup?'สร้างบัญชี':'เข้าสู่ระบบ'}</button>
   {signup&&<p className="muted auth-note">หลังสมัคร ให้เปิดอีเมลยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ</p>}
  </form>
  {submittedMode===signup&&authState.message&&<p role={authState.error?'alert':'status'}>{authState.message}</p>}
 </div>;
}
