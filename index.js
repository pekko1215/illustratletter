const illustYa = require('./illustYaModule.js')
const kuromoji = require("kuromoji");
const Twitter = require('twitter');
const client = new Twitter(require('./tokens.json'));
const request = require('request')
kuromoji.builder({ dicPath: "./node_modules/kuromoji/dict/" }).build(function (err, tokenizer) {
    // tokenizer is ready
    // var path = tokenizer.tokenize("すもももももももものうち");
    illustYa.then((IL)=>{
	    function tokenizeTweet(tweet){
			return tokenizer
				.tokenize(tweet.text
					.replace(/[\(\)\（\）\[\]、…。？！!\?]/g,' ')
				)
		}
		function filterCommonWord(arr,pos){
			return arr
			.filter(d=>d.pos=='名詞')
			// .filter(d=>d.pos_detail_1 == '一般')
			.sort( (a,b) => b.surface_form.length<a.surface_form.length)
		}
		function pickupURLByTokens(tokens){
			return new Promise(function(r){
				if(!tokens.length){r(null);return}
				var token = tokens.pop();
				console.log(`--Choice ${token}`)
				IL.search(token)
				.then((results)=>{
					console.log(`└ Hit ${results.length}`)
					if(!results.length){
						arguments.callee(r)
					}else{
						r(results[Math.floor(Math.random()*results.length)])
					}
				})
			})

		}
		client.stream('user',(stream)=>{
			stream.on('data',(tweet)=>{
				var toUser = tweet.text.match(/@.+ /)
				tweet.text = tweet.text.replace(/@.+ /,'');
				var id_str = tweet.id_str;
				if(!toUser){return}
				if(tweet.retweeted_status){return}
				toUser = toUser[0].replace('@illustratletter ','')
				// console.log(tweet)
				if(tweet.user.screen_name=='illustratletter'){return}
				var tokens = filterCommonWord(tokenizeTweet(tweet)).map(d=>d.surface_form);
				pickupURLByTokens(tokens).then((data)=>{
					if(!data){return}
					request.get({
						url:data.url,
						method:'GET',
						encoding:null
					},(err,res,body)=>{
						client.post('media/upload',{media:body},(err,media,res)=>{
							if(err){
								console.error(err);
								return;
							}
							var status = {
								status:'@'+tweet.user.screen_name+' '+toUser + data.title,
								media_ids:media.media_id_string,
								in_reply_to_status_id:id_str
							}
							client.post('statuses/update',status,(err)=>{
							})
						})
					})
				})
			})
		})
	})
});