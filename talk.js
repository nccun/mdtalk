Date.prototype.format = function (fmt) {
  var o = {
    "M+": this.getMonth() + 1,
    "d+": this.getDate(),
    "h+": this.getHours(),
    "m+": this.getMinutes(),
    "s+": this.getSeconds(),
    "q+": Math.floor((this.getMonth() + 3) / 3),
    "S": this.getMilliseconds()
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
};

Promise = function() {
  var success = null,
    failure = null;
  this.resolve = function() {
    success.apply(null, arguments);
    return this;
  };
  this.reject = function() {
    failure.apply(null, arguments);
    return this;
  };
  this.then = function(fn) {
    success = fn;
    return this;
  };
  this.fail = function(fn) {
    failure = fn;
    return this;
  };
};

(function($) {
	$.fn.draggable = function(target) {
		var cx, cy, mx, my, $target, isDrag;
		$target = (target instanceof jQuery) ? target : $(target); 
		this.on('mousedown', function(event) {
			cx = event.pageX;
			cy = event.pageY;
			isDrag = true;
		}).on('mousemove', function(event) {
			if (isDrag) {
				mx = event.pageX - cx;
				my = event.pageY - cy;
				cx = event.pageX;
				cy = event.pageY;
				var offset = $target.offset();
				$target.css('left', (offset.left + mx) + 'px');
				$target.css('top', (offset.top + my) + 'px');
			}
		}).on('mouseup', function() {
			isDrag = false;
			if (window.localStorage) {
				var offset = $target.offset();
				x = localStorage.setItem('md.x', offset.left);
				y = localStorage.setItem('md.y', offset.top);
			}
		});
	};
  /**
   *
   * status: -1 发送失败 0 发送中 1/默认 发送成功
   */
	$.fn.mdtalk = function(option) {
		var $trigger = this,
      // 13回车键, 10 Ctrl+回车键
			hotkey,
			x, y,
      msgId = -1,
      // 加载更多次数
      loadedCount = 0,
      historyTemp = '<li class="history"><span>以上是历史消息</span></li>',
      msgTemp = '<li class="clearfix {{user}}" data-id="{{id}}"><img src="{{header}}"><div class="message"><span class="status{{pending}}"><span class="fa fa-spinner fa-spin pending"></span><span class="failed">!</span></span><p class="text"><span class="timer">{{timer}}</span>{{text}}</p></div></li>',
			$html = $('<div class="talk-container"><div class="heading"><span class="to-name fa fa-comment"></span><div class="operation pull-right"><span class="fa fa-close talk-close"></span></div></div><div class="talk-content"><div class="more"><span class="fa fa-spinner fa-spin loading"></span><span class="fa fa-clock-o icon"></span>&nbsp;点击查看更多</div><ul></ul></div><div class="talk-post"><textarea placeholder="请输入要发送的信息"></textarea><div class="btn-group dropup"><button type="button" class="btn btn-success send">发送</button><button type="button" class="btn btn-success dropdown-toggle" data-toggle="dropdown"><span class="caret"></span><span class="sr-only">选择发送快捷键</span></button><ul class="dropdown-menu" role="menu"><li><a href="javascript:void(0);" data-hotkey="13"><span class="hotkey"></span>按Enter键发送</a></li><li><a href="javascript:void(0);" data-hotkey="10"><span class="hotkey"></span>按Ctrl+Enter键发送</a></li></ul></div></div></div>');
		var $text = $html.find('.talk-post textarea'),
      $talkBody = $html.find('.talk-content ul');
		if (window.localStorage) {
			hotkey = parseInt(localStorage.getItem('md.hotkey'));
      if (hotkey !== 10 && hotkey !== 13) {
        hotkey = 13;
      }
			x = localStorage.getItem('md.x');
			y = localStorage.getItem('md.y');
		}
		if (!x) {
			var $window = $(window);
			x = ($window.width() / 2) - 300;
			y = ($window.height() / 2) - 276;
		}
		$html.css({'left': x + 'px', 'top': y + 'px'}).hide()
			.delegate('.heading .talk-close', 'click', function() {
				// 关闭按钮
				$('.talk-container').hide();
			})
      .delegate('.talk-content .more', 'click', function() {
        var $this = $(this).addClass('loading');
        var promise = option.more(loadedCount);
        loadedCount++;
        promise.then(function(talks) {
          $this.removeClass('loading');
          more(talks);
        }).fail(function() {
          $this.removeClass('loading');
        });
      })
      .delegate('.talk-post textarea', 'keypress', function(event) {
        if (event.keyCode === 10 || event.keyCode === 13) {
          if (event.keyCode === hotkey) {
            event.preventDefault();
            send();
          }
        }
      })
      .delegate('.talk-post .btn-group ul li a', 'click', function(event) {
        var $this = $(this), hk = parseInt($this.data('hotkey'));
        hotkey = hk;
        if (window.localStorage) {
          localStorage.setItem('md.hotkey', hk);
        }
        $this.find('.hotkey').addClass('fa fa-check').parents('li').siblings().find('a .hotkey').removeClass('fa fa-check');
      })
			.delegate('.talk-post .send', 'click', function() {
				// 发送
				send();
			})
			.find('.to-name').text(' ' + option.to.name);
    $html.find('.talk-post .btn-group ul li a[data-hotkey="' + hotkey + '"]').find('.hotkey').addClass('fa fa-check');
		$('body').append($html);
    // 头部可拖动
    $html.find('.heading:not(.operation)').draggable('.talk-container');
		$trigger.on('click', function() {
			$html.toggle();
		});

    // 消息发送
    function send() {
      var value = $text.val();
      if (!value) {
        // 没有输入内容
        $text.attr('placeholder', '发送内容不能为空').addClass('empty-text');
        setTimeout(function() {
          $text.attr('placeholder', '请输入要发送的信息').removeClass('empty-text');
        }, 500);
      } else {
        $text.val('');
        var promise = option.send(value.replace('\n', '<br/>'));
        var id = insert({
          _id: option.me._id,
          text: value.replace('\n', '<br/>'),
          status: 0
        });
        promise.then(function() {
          $('.talk-container .talk-content > ul > li[data-id=' + id + ']').find('.message .status').removeClass('pending');
        }).fail(function() {
          $('.talk-container .talk-content > ul > li[data-id=' + id + ']').find('.message .status').removeClass('pending').addClass('failed');
          console.error('消息id' + id + '发送失败,请重试！');
        });
        // 滚动到底部
        var $container = $('.talk-container .talk-content'), ul = $('.talk-container .talk-content ul');
        $container.animate({scrollTop: ul.height()}, 'fast');
      }
    }

    /** 根据参数生成要插入的html数据 */
    function generateMsg(talks) {
      if (!(talks instanceof Array)) {
        talks = [talks];
      }
      var str = '';
      $.each(talks, function(i, v) {
        var msg = null;
        msgId ++;
        if (v._id !== option.me._id) {
          msg = msgTemp.replace('\{\{user\}\}', '').replace('\{\{header\}\}', option.to.header).replace('\{\{pending\}\}', '');
        } else {
          msg = msgTemp.replace('\{\{id\}\}', msgId).replace('\{\{user\}\}', 'current-user').replace('\{\{header\}\}', option.me.header);
          // 发送中状态
          if (v.status === 0) {
            msg = msg.replace('\{\{pending\}\}', ' pending');
          } else {
            // 默认发送成功
            msg = msg.replace('\{\{pending\}\}', '');
          }
        }
        var date = v.time ? new Date(Date.parse(v.time)) : new Date();
        str += msg.replace('\{\{text\}\}', v.text).replace('\{\{timer\}\}', date.format('yyyy-M-d h:m:s'));
      });
      return str;
    }

    // 插入(在最后)
    function insert(talk) {
      var $msg = $(generateMsg(talk));
      var id = parseInt($msg.data('id'));
      $talkBody.append($msg);
      return id;
    }

    // 插入(在最前面)
    function more(talks) {
      $talkBody.prepend(generateMsg(talks));
    }

    // 载入历史消息
    function history(talks) {
      var $h = $(historyTemp);
      $talkBody.prepend($h);
      $talkBody.prepend(generateMsg(talks));
    }

    return {
      append: insert,
      history: history
    };
	}
})(jQuery);