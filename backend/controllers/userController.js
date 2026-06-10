const getTestAPI = (req, res) => {
    res.status(200).json({
        success: true,
        message: "CuapCuap API is working!"
    });
};

module.exports = {
    getTestAPI
};