const AuthService = require("../services/auth.service");
const { CREATED, SUCCESS } = require("../core/success.response");
const { BadRequestError } = require("../core/error.response");

// 🔐 Register
const signup = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new BadRequestError("Missing required fields");
    }

    const result = await AuthService.signup(req.body);

    return new CREATED({
      message: "User registered successfully",
      metaData: result,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

// 🔑 Login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new BadRequestError("Missing username or password");
    }

    const result = await AuthService.login(username, password);

    return new SUCCESS({
      message: "Login successful",
      metaData: result,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

// 🚪 Logout
const logout = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const accessToken = req.token;

    await AuthService.logout(userId, accessToken);

    return new SUCCESS({
      message: "Logout successful",
      metaData: { success: true },
    }).send(res);
  } catch (error) {
    // Theo requirement: luôn trả success
    return new SUCCESS({
      message: "Logout successful",
      metaData: { success: true },
    }).send(res);
  }
};

// 🔄 Refresh token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new BadRequestError("Refresh token is required");
    }

    const result = await AuthService.refreshToken(refreshToken);

    return new SUCCESS({
      message: "Tokens refreshed successfully",
      metaData: result,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  logout,
  refreshToken,
};
