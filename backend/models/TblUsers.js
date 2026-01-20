const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const CustomError = require("../exceptions/customError");
const prisma = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

async function getUserByLoginId(loginId) {
  try {
    const user = await prisma.tblUsers.findFirst({
      where: { UserLoginID: loginId },
    });
    return user;
  } catch (error) {
    console.error("Error fetching user by login ID:", error.message || error);
    throw new CustomError("Error fetching user by login ID");
  }
}

async function createUser(userLoginID, userPassword, salesmanCode) {
  try {
    const hashedPassword = await bcrypt.hash(userPassword, 10);
    const newUser = await prisma.tblUsers.create({
      data: {
        UserLoginID: userLoginID,
        UserPassword: hashedPassword,
        SalesmanCode: salesmanCode,
        UserLoginStatus: 1 // Assuming 1 means active
      },
    });
    return newUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Error creating user");
  }
}

async function loginUser(userLoginID, userPassword) {
  try {
    const user = await prisma.tblUsers.findFirst({
      where: { UserLoginID: userLoginID },
    });

    if (!user) {
      const error = new CustomError("Invalid login id entered");
      error.statusCode = 404;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(
      userPassword,
      user.UserPassword
    );
    if (!isPasswordValid) {
      const error = new CustomError("Invalid login password entered");
      error.statusCode = 404;
      throw error;
    }

    // Update user login status to 1 (assuming UserLogonStatus is a field in tblUsers)
    const updatedUser = await prisma.tblUsers.update({
      where: { TblSysNoID: user.TblSysNoID },
      data: {
        UserLoginStatus: 1,
      },
    });

    const token = jwt.sign(
      {
        userId: user.TblSysNoID,
        email: user.UserLoginID,
      },
      JWT_SECRET
    );

    return {
      token,
      user: user,
    };
  } catch (error) {
    throw error;
  }
}

async function verifyEmail(userLoginID) {
  try {
    const user = await getUserByLoginId(userLoginID);
    if (!user) {
      const error = new CustomError("User not found", 404);
      error.statusCode = 404;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user.TblSysNoID,
        email: user.UserLoginID,
      },
      JWT_SECRET
    );

    return token;
  } catch (error) {
    console.error("Error verifying email:", error);
    throw error;
  }
}

async function resetPassword(userLoginID, newPassword) {
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await getUserByLoginId(userLoginID);
    if (!user) {
      const error = new CustomError("User not found", 404);
      error.statusCode = 404;
      throw error;
    }

    // Update the user's password in the database
    const updatedUser = await prisma.tblUsers.update({
      where: { TblSysNoID: user.TblSysNoID },
      data: {
        UserPassword: hashedPassword,
      },
    });

    // Return the updated user object (optional)
    return updatedUser;
  } catch (error) {
    // Handle errors
    console.error("Error resetting password:", error);
    throw error;
  }
}

async function logoutUser(userLoginID) {
  try {
    const user = await getUserByLoginId(userLoginID);
    if (!user) {
      const error = new CustomError("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (user.UserLoginStatus == 0) {
      const error = new CustomError("User is already logged out");
      error.statusCode = 400;
      throw error;
    }

    // Update user login status to 0 (logged out)
    const updatedUser = await prisma.tblUsers.update({
      where: { TblSysNoID: user.TblSysNoID },
      data: {
        UserLoginStatus: 0,
      },
    });

    return updatedUser;
  } catch (error) {
    console.error("Error logging out user:", error);
    throw error;
  }
}

async function fetchAll() {
  try {
    const users = await prisma.tblUsers.findMany();
    return users;
  } catch (error) {
    throw new CustomError("Error fetching users");
  }
}

async function deleteUser(userId) {
  try {
    const deletedUser = await prisma.tblUsers.delete({
      where: { TblSysNoID: Number(userId) },
    });
    return deletedUser;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new CustomError("Error deleting user");
  }
}

async function getUserById(userId) {
  try {
    const user = await prisma.tblUsers.findUnique({
      where: { TblSysNoID: Number(userId) },
    });
    return user;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw new CustomError("Error fetching user");
  }
}

async function updateUser(userId, data) {
  try {
    if (data.UserPassword) {
      data.UserPassword = await bcrypt.hash(data.UserPassword, 10);
    }
    const existingUser = await getUserByLoginId(data.UserLoginID);
    if (!existingUser) {
      const error = new CustomError("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (existingUser.TblSysNoID != userId) {
      const error = new CustomError("This email address is already in use");
      error.statusCode = 404;
      throw error;
    }

    const updatedUser = await prisma.tblUsers.update({
      where: { TblSysNoID: Number(userId) },
      data: data,
    });
    return updatedUser;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  createUser,
  getUserByLoginId,
  loginUser,
  verifyEmail,
  resetPassword,
  logoutUser,
  fetchAll,
  deleteUser,
  getUserById,
  updateUser,
};
