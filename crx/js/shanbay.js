var initialize=0;
function ls(){
    chrome.extension.sendRequest({method: "getLocalStorage"}, function (response) {
        for (k in response.data)
            localStorage[k] = response.data[k];
    });
    return localStorage;
}

$(function () {
    $(document).on('dblclick', function () {
        var text = window.getSelection().toString().trim().match(/^[a-zA-Z\s']+$/);
        console.info("selected "+text);
        if (undefined != text && null!=text&&0<text.length&&ls()["click2s"]!='no'){
            console.log("searching "+text);
            chrome.extension.sendMessage({
                method: 'lookup',
                action: 'lookup',
                data: text[0]
            },function(resp){
                console.log(resp.data)
            });
            popover({
                shanbay:{
                    loading:true,
                    msg:"..."
                }
            })
        }
    });
});


chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    console.log("received\n");
    console.log(message.data);
	switch(message.action) {
		case 'popover':
			popover(message.data);
			break;
	}
});

function popover(alldata) {
    var data=alldata.shanbay;
    var webster=alldata.webster;

	console.log('popover');//loading notification
	var html = '<div id="shanbay_popover">';
  var htmltmp ='';
  if(data.loading==true){
    console.log("status 0, loading");
  }
//   if(data.data==undefined){ //loading
//         html += '<p><span class="word">'+data.msg+'</span></p>';
//        console.log("condition 1, loading");
// }
//     else 
  else{
    htmltmp ='<div class="popover-inner"><h3 class="popover-title">';
    if(data.status_code==1){//word not exist
        htmltmp += '未找到单词</h3></div>';
      console.log("condition 2, unfound");
        }
     
    else if(data.status_code==0){
      console.log("learning_id: ",data.data.learning_id);
    if(data.data.learning_id==undefined){// word exist, but not learned
        console.log("condition 3, not learned");
              htmltmp += '<span class="word">'+data.data.content+'</span>'
              +'<span class="pronunciation">'+(data.data.pron.length ? ' ['+data.data.pron+'] ': '')+'</span>'
            +'<a href="#" class="speak us"><svg class="icon-speak" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="#FFEB3B"><path d="M12.79 9c0-1.3-.72-2.42-1.79-3v6c1.06-.58 1.79-1.7 1.79-3zM2 7v4h3l4 4V3L5 7H2zm9-5v1.5c2.32.74 4 2.93 4 5.5s-1.68 4.76-4 5.5V16c3.15-.78 5.5-3.6 5.5-7S14.15 2.78 11 2z"/></svg></i></a></h3>'
            +'<div>'
            +'<p class="popover-content">'+data.data.definition.split('\n').join("<br/>")+"<br/>"+'</p></div>'
            +'<div class="action-area"><a href="#" class="shanbay-btn" id="shanbay-add-btn">添加生词</a>'
            +'<a href="#" target="_blank" class="shanbay-btn hide" id="shanbay-check-btn">查看</a>'
            +'<p class="success hide">成功添加！</p>'
            +'</div>';
            }
    else {// word recorded
    console.log("condition 4, learned");
      var forgotUrl="http://www.shanbay.com/review/learning/"+data.data.learning_id;
    	htmltmp += '<span class="word">'+data.data.content+'</span>'
      		+'<span class="pronunciation">'+(data.data.pron.length ? ' ['+data.data.pron+'] ': '')+'</span>'
			+'<a href="#" class="speak us"><svg class="icon-speak" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="#FFEB3B"><path d="M12.79 9c0-1.3-.72-2.42-1.79-3v6c1.06-.58 1.79-1.7 1.79-3zM2 7v4h3l4 4V3L5 7H2zm9-5v1.5c2.32.74 4 2.93 4 5.5s-1.68 4.76-4 5.5V16c3.15-.78 5.5-3.6 5.5-7S14.15 2.78 11 2z"/></svg></i></a></h3>'
			+'<div>'
			+'<p class="popover-content">'+data.data.definition.split('\n').join("<br/>")+'</p></div>'
      +'<div class="action-area"><a href="#" class="shanbay-btn" id="shanbay-forget-btn">我忘了</a>'
      +'<a href="'+forgotUrl+'" target="_blank" class="shanbay-btn" id="shanbay-check-btn">查看</a></div>'
      +'<p class="success hide">成功添加！</p>'
			+'</div>';
      }
    }
    htmltmp += '</div>';
}
    
    html += htmltmp;
    html += '</div>';

    if (initialize==0) {$('body').append(html);initialize++;};

    $('#shanbay_popover').html(htmltmp);
    $('#shanbay_popover').removeClass('hide');
    $('iframe #shanbay_popover').addClass('hide');

   	getSelectionOffset(function(left, top) {
		setPopoverPosition(left, top);
   	});

   	$('#shanbay-add-btn').click(function(e) {
   		e.preventDefault();
   		addNewWord(data.data.id);
   	});

    $('#shanbay-forget-btn').click(function(e) {
      e.preventDefault();
      forgetWord(data.data.learning_id);
    });

   	$('#shanbay_popover .speak.us').click(function(e) {
   		e.preventDefault();
   		var audio_url = 'http://media.shanbay.com/audio/us/' + data.data.content + '.mp3';
   		playAudio(audio_url);
   	});

   	$('html').click(function() {
      hidePopover();
    });
    $('body').on('click', '#shanbay_popover', function (e) {
      e.stopPropagation();
    });
}

function hidePopover() {
	// $('#shanbay_popover').animate({opacity:'0'},200);
  $('#shanbay_popover').addClass('hide');
  // var t=setTimeout("$('#shanbay_popover').addClass('hide');",500);
}

function getSelectionOffset(callback) {
  var left = window.innerWidth/2;
  var top = window.innerHeight/2;
  var selection = window.getSelection();
  if(0<selection.rangeCount){
  	var range = window.getSelection().getRangeAt(0);
    var dummy = document.createElement('span');
    range.insertNode(dummy);
  	left = getLeft(dummy) - 0 - dummy.offsetLeft+ $(dummy).position().left;
  	top = getTop(dummy) + 24 - dummy.offsetTop + $(dummy).position().top; ;
  	dummy.remove();
    window.getSelection().addRange(range);
  }
	callback(left, top);
}
function getTop(e){
	var offset=e.offsetTop;
	if(e.offsetParent!=null) offset+=getTop(e.offsetParent);
	return offset;
}

function getLeft(e){
	var offset=e.offsetLeft;
	if(e.offsetParent!=null) offset+=getLeft(e.offsetParent);
	return offset;
}

function setPopoverPosition(left, top) {
	$('#shanbay_popover').css({
		position: 'absolute',
		left: left,
		top: top
	});
}

function addNewWord(word_id) {
	chrome.extension.sendRequest({method: "addWord",data:word_id}, function (rsp) {
    switch(rsp.data.msg){
      case "success":
	      $('#shanbay-add-btn').text('添加成功').addClass('disable');
	      $('#shanbay-check-btn').removeClass('hide').attr('href', 'http://www.shanbay.com/review/learning/' + rsp.data.rsp.id);
        break;
      case "error":
        $('#shanbay_popover .success').text('添加失败，请重试。').removeClass('success').addClass('failed');
        break;
      default:
    }});
}

function forgetWord(learning_id) {
  chrome.extension.sendRequest({method: "forgetWord",data:learning_id}, function (rsp) {
    switch(rsp.data.msg){
      case "success":
        $('#shanbay-forget-btn').text('添加成功').addClass('disable');
        $('#shanbay-check-btn').removeClass('hide');
        break;
      case "error":
        $('#shanbay_popover .success').text('添加失败，请重试。').removeClass('success').addClass('failed');
        break;
      default:
    }});
}

function playAudio(audio_url) {
	if(audio_url) {console.log("play pronunciation");
		new Howl({
			urls: [audio_url]
		}).play();
	}
}
