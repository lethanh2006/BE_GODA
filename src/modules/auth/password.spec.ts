import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('băm và kiểm tra đúng mật khẩu', async () => {
    const hash = await hashPassword('matkhau123');
    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    await expect(verifyPassword('matkhau123', hash)).resolves.toBe(true);
    await expect(verifyPassword('sai-mat-khau', hash)).resolves.toBe(false);
  });

  it('từ chối chuỗi băm sai định dạng', async () => {
    await expect(verifyPassword('x', 'plain-text')).resolves.toBe(false);
  });
});
