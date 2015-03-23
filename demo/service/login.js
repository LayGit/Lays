Lays.service(function(){
    var params = Lays.params;

    if (params.user == 'admin' && params.pass == 'admin')
        Lay.return({code:0, data:{
            userId:1
        }, message:''});
    else
        Lays.return({code:101, data:{}, message:'账号或密码错误'});
});