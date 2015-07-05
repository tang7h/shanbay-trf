$(function() {
    chrome.contextMenus.removeAll(function () {
        if(localStorage['ctx_menu']!='no') {
            chrome.contextMenus.create({
                "title": '扇贝查找"%s"',
                "contexts": ["selection"],
                "onclick": function (info, tab) {
                    isUserSignedOn(function () {
                        getClickHandler(info.selectionText, tab);
                    });
                }
            });
        }
    });
});

var notified = false;

function notify(){
            var url="http://www.shanbay.com/";
            var opt={
                type: "basic",
                title: "登陆",
                message: "未登录无法查词哟",
                iconUrl: "icon192.png"
            };
            var notId = Math.random().toString(36);
            if (! notified && ls()['not_pop'] != 'no') {
                notification = chrome.notifications.create(notId,opt,function(notifyId){
                    console.info(notifyId + " was created.");
                    notified = true
                });
            }
            chrome.notifications.onClicked.addListener( function (notifyId) {
                console.info("notification was clicked");
                chrome.notifications.clear(notifyId,function(){});
                if (notId == notifyId) {
                    chrome.tabs.create({
                        url:url+"accounts/login/"
                    })
                }
                notified = false 
            });
            setTimeout(function(){
                chrome.notifications.clear(url,function(){});
            },5000);
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    console.log("received method: "+request.method);
    switch(request.method){
        case "getLocalStorage":
            sendResponse({data: localStorage});
            break;
        case "setLocalStorage":
            window.localStorage=request.data;
            sendResponse({data: localStorage});
            break;
        case 'lookup':
            isUserSignedOn(function() {
                getClickHandler(request.data, sender.tab);
            });
            sendResponse({data:{tabid:sender.tab.id}});
            break;
        case 'addWord':
            addNewWordInBrgd(request.data,sendResponse);
            break;
        case 'forgetWord':
            forgetWordInBrgd(request.data,sendResponse);
            break;
        case 'openSettings':
            chrome.tabs.create({url: chrome.runtime.getURL("options.html")+'#'+request.anchor});
            sendResponse({data:{tabid:sender.tab.id}});
            break;
        default :
            sendResponse({data:[]}); // snub them.
    }
});

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    var tabid = sender.tab.id;
    console.log("received "+message.data);
    switch(message.action) {
        case 'is_user_signed_on':
            isUserSignedOn();
            break;
        case 'lookup':
            isUserSignedOn(function() {
                getClickHandler(message.data, sender.tab);
            });
            break;
    }
});

function addNewWordInBrgd(word_id,sendResponse) {
	chrome.cookies.getAll({"url": 'http://www.shanbay.com'}, function (cookies){
	$.ajax({
		url: 'http://www.shanbay.com/api/v1/bdc/learning/',
		type: 'POST',
	    dataType: 'JSON',
	    contentType: "application/json; charset=utf-8",
	    data:JSON.stringify({
	      content_type: "vocabulary",
	      id: word_id
	    }),
	    success: function(data) {
	      sendResponse({data: {msg:'success',rsp:data.data}});
	      console.log('success');
	    },
	    error: function() {
	      sendResponse({data: {msg:'error',rsp:{}}});
	      console.log('error');
	    },
	    complete: function() {
	      console.log('complete');
	    }
	});
	});
}

function forgetWordInBrgd(learning_id,sendResponse) {
    chrome.cookies.getAll({"url": 'http://www.shanbay.com'}, function (cookies){
    $.ajax({
        url: 'http://www.shanbay.com/api/v1/bdc/learning/' + learning_id,
        type: 'PUT',
        dataType: 'JSON',
        contentType: "application/json; charset=utf-8",
        data:JSON.stringify({
          retention: 1
        }),
        success: function(data) {
          sendResponse({data: {msg:'success',rsp:data.data}});
          console.log('success');
        },
        error: function() {
          sendResponse({data: {msg:'error',rsp:{}}});
          console.log('error');
        },
        complete: function() {
          console.log('complete');
        }
    });
    });
}

function normalize(word){
    return word.replace(/·/g,'');
}

var getLocaleMessage = chrome.i18n.getMessage;
var API = 'http://www.shanbay.com/api/v1/bdc/search/?word=';


function isUserSignedOn(callback) {
    chrome.cookies.get({"url": 'http://www.shanbay.com', "name": 'sessionid'}, function (cookie) {
        if (cookie) {
            localStorage.setItem('shanbay_cookies', cookie);
            callback();
        } else {
            localStorage.removeItem('shanbay_cookies');
            notify();console.log('notify');
        }
    });
}

function getClickHandler(term, tab) {
  console.log('signon');
  var url = API + normalize(term);//normalize it only 

  $.ajax({
    url: url,
    type: 'GET',
    dataType: 'JSON',
    contentType: "application/json; charset=utf-8",
    success: function(data) {
      console.log('success');
      if((1==data.status_code)||localStorage['search_webster']=='yes')
        getOnlineWebsterCollegiate(term,function(word,json){
            var defs=json.fls.map(function(i){
                return "<span class='web_type'>"+json.fls[i].textContent+'</span>, '+json.defs[i].textContent
            }).toArray().join('<br/>');
            chrome.tabs.sendMessage(tab.id, {
                action: 'popover',
                data: {shanbay:data,webster:{term:json.hw[0].textContent.replace(/\*/g, '·'),defs:defs}}
            });
        });
      else chrome.tabs.sendMessage(tab.id, {
        action: 'popover',
        data: {shanbay:data}
      });
    },
    error: function() {
      console.log('error');
    },
    complete: function() {
      console.log('complete');
    }
  });
}

function singularize(word) {
  var specailPluralDic = {
    'men': 'man',
    'women': 'woman',
    'children': 'child'
  };
  var result = specailPluralDic[word];
  if(result) {
    return result;
  }

  var pluralRule = [{
    'match': /s$/,
    'replace': ''
  }];
 
  for(var j=0; j<pluralRule.length; j++) {
    if(word.match(pluralRule[j].match)) {
      return word.replace(pluralRule[j].match, pluralRule[j].replace);
    }
  }

  return word;
}