export const toUserDTO = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
});
