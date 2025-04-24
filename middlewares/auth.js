import jwt from "jsonwebtoken";


const userAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer token

    if (!token) {
        return res.status(401).json({
            sucess: false,
            message: "Unauthorized access",      
        })
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

        if (tokenDecode.id) {
            req.body = req.body || {};
            req.body.userId = tokenDecode.id;
            
        } else {
            return res.status(401).json({
                sucess: false,
                message: "Unauthorized access",
            })
        }

        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message,
        })
    }
};


export default userAuth;