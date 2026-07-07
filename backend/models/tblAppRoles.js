const prisma = require("../db");

class Role {
  static async getRoleByName(roleName) {
    try {
      const role = await prisma.tblAppRoles.findFirst({
        where: {
          RoleName: roleName,
        },
      });
      return role;
    } catch (error) {
      console.error("Error finding role by name:", error);
      throw new Error("Error finding role by name");
    }
  }

  static async createRole(roleName) {
    try {
      const newRole = await prisma.tblAppRoles.create({
        data: {
          RoleName: roleName,
        },
      });
      return newRole;
    } catch (error) {
      console.error("Error creating role:", error);
      throw new Error("Error creating role");
    }
  }

  static async assignRoleToUser(userLoginID, roleName) {
    try {
      const role = await this.getRoleByName(roleName);
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }
      const userRole = await prisma.tblUserRoles.create({
        data: {
          UserLoginID: userLoginID,
          RoleID: role.RoleID,
        },
      });
      return userRole;
    } catch (error) {
      console.error("Error assigning role to user:", error);
      throw new Error("Error assigning role to user");
    }
  }

  static async getRolesByUserLoginId(userLoginID) {
    try {
      const roles = await prisma.tblUserRoles.findMany({
        where: { UserLoginID: userLoginID },
        include: {
          role: true,
        },
      });
      return roles.map((userRole) => userRole.role);
    } catch (error) {
      console.error("Error fetching roles for user:", error);
      throw new Error("Error fetching roles for user");
    }
  }

  static async getRoles() {
    try {
      const roles = await prisma.tblAppRoles.findMany({});
      return roles;
    } catch (error) {
      console.error("Error fetching roles for user:", error);
      throw new Error("Error fetching roles for user");
    }
  }

  static async getRoleById(roleID) {
    try {
      const role = await prisma.tblAppRoles.findUnique({
        where: { RoleID: roleID },
      });
      return role;
    } catch (error) {
      console.error("Error fetching role by ID:", error);
      throw new Error("Error fetching role by ID");
    }
  }

  static async deleteRole(roleID) {
    try {
      const deletedRole = await prisma.tblAppRoles.delete({
        where: { RoleID: roleID },
      });
      return deletedRole;
    } catch (error) {
      console.error("Error deleting role:", error);
      throw new Error("Error deleting role");
    }
  }

  static async updateRole(roleID, roleName) {
    try {
      const updatedRole = await prisma.tblAppRoles.update({
        where: { RoleID: roleID },
        data: { RoleName: roleName },
      });
      return updatedRole;
    } catch (error) {
      console.error("Error updating role:", error);
      throw new Error("Error updating role");
    }
  }

  static async removeRoleFromUser(userLoginID, roleName) {
    try {
      const role = await this.getRoleByName(roleName);
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }
      const removedRole = await prisma.tblUserRoles.deleteMany({
        where: {
          UserLoginID: userLoginID,
          RoleID: role.RoleID,
        },
      });
      return removedRole;
    } catch (error) {
      console.error("Error removing role from user:", error);
      throw new Error("Error removing role from user");
    }
  }

  static async assignRoles(userLoginID, roleNames) {
    try {
      // Get all roles by their names
      const roles = await Promise.all(
        roleNames.map((roleName) => this.getRoleByName(roleName))
      );

      // Get the roles already assigned to the user
      const existingRoles = await prisma.tblUserRoles.findMany({
        where: {
          UserLoginID: userLoginID,
          RoleID: {
            in: roles.map((role) => role.RoleID),
          },
        },
        select: {
          RoleID: true,
        },
      });

      // Filter out roles that are already assigned to the user
      const existingRoleIDs = existingRoles.map((userRole) => userRole.RoleID);
      const newRoles = roles.filter(
        (role) => !existingRoleIDs.includes(role.RoleID)
      );

      // Assign the new roles to the user
      if (newRoles.length > 0) {
        const userRoles = await prisma.tblUserRoles.createMany({
          data: newRoles.map((role) => ({
            UserLoginID: userLoginID,
            RoleID: role.RoleID,
          })),
        });

        return userRoles;
      } else {
        return { message: "All roles are already assigned to the user" };
      }
    } catch (error) {
      console.error("Error assigning roles to user:", error);
      throw new Error("Error assigning roles to user");
    }
  }

  static async removeRoles(userLoginID, roleNames) {
    try {
      // Get all roles by their names
      const roles = await Promise.all(
        roleNames.map((roleName) => this.getRoleByName(roleName))
      );

      // Filter out any roles that were not found
      const validRoles = roles.filter((role) => role !== null);

      // Get the roles currently assigned to the user
      const existingRoles = await prisma.tblUserRoles.findMany({
        where: {
          UserLoginID: userLoginID,
        },
        select: {
          RoleID: true,
        },
      });

      // Filter out roles that are not assigned to the user
      const existingRoleIDs = existingRoles.map((userRole) => userRole.RoleID);
      const rolesToRemove = validRoles.filter((role) =>
        existingRoleIDs.includes(role.RoleID)
      );

      // If there are roles to remove, remove them
      if (rolesToRemove.length > 0) {
        const removedRoles = await prisma.tblUserRoles.deleteMany({
          where: {
            UserLoginID: userLoginID,
            RoleID: {
              in: rolesToRemove.map((role) => role.RoleID),
            },
          },
        });

        return removedRoles;
      } else {
        return {
          message: "None of the specified roles are assigned to the user",
        };
      }
    } catch (error) {
      console.error("Error removing roles from user:", error);
      throw new Error("Error removing roles from user");
    }
  }
}

module.exports = Role;
