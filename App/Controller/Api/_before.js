module.exports = async function (req, res,result) { //before any action do here something with req, res.
    //CORS access from any:
    res.header('Access-Control-Allow-Origin', '*');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    result = {
        status:'success'
    }
    if(typeof req.headers.authorization != "undefined"){

        let $token = req.headers.authorization.split(' ');
        if ($token[0] == 'Bearer'){
        //compare $token[1] with something known
        }else{
            result.status = 'error';
            result.message = 'Auth wrong type';
        }
    }else{
        result.status = 'error',
        result.message = 'Unautorized access denied'
    }
    return result;
}