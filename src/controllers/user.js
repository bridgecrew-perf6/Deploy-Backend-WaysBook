// Import model
const { user } = require("../../models");

// Import packahe
const fs = require("fs");

// User
exports.user = async (req, res) => {
    try {
        const { id } = req.params;

        // Select data user from database by id params
        let data = await user.findOne({
            where: {
                id,
            },
            attributes: {
                exclude: ["createdAt", "updatedAt"],
            },
        });

        // Checking if data null
        if (data === null) {
            return res.send({
                status: "failed",
                message: "Data not found!",
            });
        }
        data = JSON.parse(JSON.stringify(data));
        data = {
            ...data,
        };
        // Send response to client
        res.send({
            status: "success",
            data,
        });
    } catch (error) {
        console.log(error);
        res.send({
            status: "failed",
            message: "Server Error",
        });
    }
};

// Users
exports.users = async (req, res) => {
    try {
        // Select all data users from database
        const data = await user.findAll({
            attributes: {
                exclude: ["password", "subscribe_status", "role", "createdAt", "updatedAt"],
            },
        });

        // If data null
        if (data.length === 0) {
            res.send({
                status: "failed",
                message: "Data not found!",
            });
        }

        // Send response to client
        res.send({
            status: "success",
            data: {
                users: data,
            },
        });
    } catch (error) {
        console.log(error);
        res.send({
            status: "failed",
            message: "Server Error",
        });
    }
};

// Edit user
exports.editUser = async (req, res) => {
    try {
        // Get id from params
        const { id } = req.params;

        // Update data user checking by id
        let checkId = await user.findOne({
            where: {
                id,
            },
        });
        checkId = JSON.parse(JSON.stringify(checkId));
        if (checkId === null) {
            return res.send({
                status: "failed",
                message: "User not found!",
            });
        } else {
            await user.update(
                { ...checkId, subscribe_status: req.body.subscribe_status },
                {
                    where: {
                        id,
                    },
                }
            );
        }

        // Get data user
        let data = await users.findOne({
            where: {
                id,
            },
            attributes: {
                exclude: ["createdAt", "updatedAt"],
            },
        });
        data = JSON.parse(JSON.stringify(data));

        // Send response to client
        res.send({
            user: data,
        });
    } catch (error) {
        console.log(error);
    }
};

// Edit user profile
exports.editUserProfile = async (req, res) => {
    try {
        // Get id from parameter
        const { id } = req.params;

        // Get all data from body
        const dataBody = req.body;

        // Get user
        let getUser = await users.findOne({
            where: {
                id,
            },
        });

        // Parse to json
        getUser = JSON.parse(JSON.stringify(getUser));

        if (getUser === null) {
            return res.send({
                status: "failed",
                message: "User not found!",
            });
        }
        if (req.file === undefined) {
            await user.update(
                {
                    ...getUser,
                    ...dataBody,
                },
                {
                    where: {
                        id,
                    },
                }
            );
        } else {
            if (getUser.photo_profile !== null) {
                fs.unlinkSync("uploads/" + getUser.photo_profile);
            }
            await user.update(
                {
                    ...getUser,
                    ...dataBody,
                    photo_profile: req.file.filename,
                },
                {
                    where: {
                        id,
                    },
                }
            );
        }

        // Get data user
        let data = await user.findOne({
            where: {
                id,
            },
        });

        // Parse to JSON
        data = JSON.parse(JSON.stringify(data));
        data = {
            ...data,
            photo_profile: process.env.FILE_PATH + data.photo_profile,
        };

        // Send response to client
        res.send({
            status: "success",
            user: data,
        });
    } catch (error) {
        console.log(error);
        res.send({
            status: "failed",
            message: "Server Error",
        });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        // Get id from parameter
        const { id } = req.params;

        // Checking id user
        const checkId = await user.findOne({
            where: {
                id,
            },
        });
        if (checkId === null) {
            return res.send({
                status: "failed",
                message: `User id ${id} not found!`,
            });
        }

        // Delete data from databse
        await user.destroy({
            where: {
                id,
            },
        });

        // Send response to client
        res.send({
            status: "success",
            data: {
                id,
            },
        });
    } catch (error) {
        console.log(error);
        res.send({
            status: "failed",
            message: "Server Error",
        });
    }
};
