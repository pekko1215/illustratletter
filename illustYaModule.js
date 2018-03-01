module.exports = (function() {
    const request = require('request');
    const cheerio = require('cheerio');
    const EndPoint = "http://www.irasutoya.com/feeds/posts/summary"
    const SearchPoint = "http://www.irasutoya.com/search?q=";
    var _ILY = function() {};
    _ILY.prototype.send = function(base, params) {
        return new Promise((r) => {
            var url = base;
            url += `?alt=json`
            params = params || {}
            Object.keys(params).forEach((key, i) => {
                url += "&"
                url += key;
                url += "=";
                url += encodeURI(params[key]);
            })
            request({
                url,
                json: true
            }, (err, res, body) => {
                r(body)
            })
        })
    }
    _ILY.prototype.getIllsutById = function(id) {
        return this.send(EndPoint, {
                "start-index": id,
                "max-results": 1,
            })
            .then(f => this.feedParser(f))
            .then((feed) => {
                return new this.Illust(feed.entry[0], id)
            })
    }

    _ILY.prototype.getRandomIllust = function() {
        return this.getIllsutById(Math.floor(Math.random() * this.maxIllust));
    }

    _ILY.prototype.init = function() {
        return this.send(EndPoint, {
            "max-results": 0
        }).then(f => this.feedParser(f));
    }
    _ILY.prototype.feedParser = function(feed) {
        feed = feed.feed;
        this.category = feed.category.map((c) => {
            return c.term;
        })
        this.maxIllust = parseInt(feed.openSearch$totalResults.$t);
        return feed
    }
    _ILY.prototype.Illust = function(feed, id) {
        this.category = feed.category.map(d => d.term);
        this.id = id;
        this.thumbnailURL = feed.media$thumbnail.url;
        this.originalURL = this.thumbnailURL.replace('s72-c', 's800');
        this.name = feed.summary.$t;
        this.title = feed.title.$t;
    }
    _ILY.prototype.search = function(text) {
        return new Promise((r) => {
            request({
                url: SearchPoint + encodeURIComponent(text)
            }, (err, res, body) => {
                const $ = cheerio.load(body, {
                    xmlMode: true,
                    withDomLvl1: false,
                    normalizeWhitespace: true,
                })
                r($('.boxim > a > script').map((i,e)=>{
					var script = $(e).text();
					var ret = {}
					var document = {
						write:()=>{}
					}
					var bp_thumbnail_resize = function(url,title){
						ret = {url,title}
					}
					eval(script)
					return ret
                }))
            })
        }).then((urls)=>{
			urls = Array.from(urls)
			var tasks = urls.map((data)=>{
				data.url = data.url.replace('s72-c', 's800');
				return data
			})
			return tasks
        })
    }
    return (function(cl) {
        var il = new _ILY;
        if (cl) {
            il.init().then(() => { cl(il) })
        } else {
            return il.init().then(() => il)
        }
    })()
})()