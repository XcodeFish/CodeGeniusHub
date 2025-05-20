export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'YOUR_SUPER_STRONG_SECRET_KEY', 
  accessTokenExpiresIn: '6h', // access token 有效期
  refreshTokenExpiresIn: '7d', // refresh token 有效期
  refreshTokenCookieName: 'refresh_token', // refresh token cookie 名称
};
