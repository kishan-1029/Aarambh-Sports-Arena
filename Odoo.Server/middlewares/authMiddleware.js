import jwt from "jsonwebtoken";

export const authMiddleware = (roles) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Not logged in",
        status: 401,
        message: "Not logged in",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, please login",
        error: "Not authorized, please login",
        status: 401,
      });
    }

    let verified;

    for (const role of roles) {
      try {
        verified = jwt.verify(
          token,
          process.env[`${role.toUpperCase()}_JWT_SECRET_KEY`],
        );

        if (verified) break;
      } catch {
        continue;
      }
    }

    if (!verified || !verified.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
        error: "Invalid token",
        status: 401,
      });
    }

    req.user = {
      id: verified.id,
      role: verified.role,
    };

    next();
  };
};
