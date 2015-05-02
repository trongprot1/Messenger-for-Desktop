var gui = window.require('nw.gui');
var platform = require('./platform');
var settings = require('./settings');
var URL = require('url');

module.exports = {
  /**
   * Update the behaviour of the given window object.
   */
  set: function(win) {
    // Show the window when the dock icon is pressed
    gui.App.removeAllListeners('reopen');
    gui.App.on('reopen', function() {
      win.show();
    });

    // Don't quit the app when the window is closed
    if (!platform.isLinux) {
      win.removeAllListeners('close');
      win.on('close', function(quit) {
        if (quit) {
          this.saveWindowState(win);
          win.close(true);
        } else {
          win.hide();
        }
      }.bind(this));
    }
  },

  /**
   * Change the new window policy to open links in the browser or another window.
   */
  setNewWinPolicy: function(win) {
    win.removeAllListeners('new-win-policy');
    win.on('new-win-policy', function(frame, url, policy) {
      if (settings.openLinksInBrowser) {
        // Skip opening it through facebook
        var parsed = URL.parse(url, true);
        var hostMatches = parsed.hostname.indexOf('facebook.com') > -1 || parsed.hostname.indexOf('messenger.com') > -1;
        if (hostMatches && parsed.pathname.indexOf('/l.php') > -1 && parsed.query.u) {
          url = decodeURIComponent(parsed.query.u);
        }

        gui.Shell.openExternal(url);
        policy.ignore();
      } else {
        policy.forceNewWindow();
      }
    });
  },

  /**
   * Listen for window state events.
   */
  bindWindowStateEvents: function(win) {
    win.removeAllListeners('maximize');
    win.on('maximize', function() {
      win.sizeMode = 'maximized';
    });

    win.removeAllListeners('unmaximize');
    win.on('unmaximize', function() {
      win.sizeMode = 'normal';
    });

    win.removeAllListeners('minimize');
    win.on('minimize', function() {
      win.sizeMode = 'minimized';
    });

    win.removeAllListeners('restore');
    win.on('restore', function() {
      win.sizeMode = 'normal';
    });
  },

  /**
   * Bind the events of the node window to the content window.
   */
  bindEvents: function(win, contentWindow) {
    ['focus', 'blur'].forEach(function(name) {
      win.removeAllListeners(name);
      win.on(name, function() {
        contentWindow.dispatchEvent(new contentWindow.Event(name));
      });
    });
  },

  /**
   * Sen an interval to sync the title.
   */
  syncTitle: function(parentDoc, childDoc) {
    setInterval(function() {
      parentDoc.title = childDoc.title;
    }, 50);
  },

  /**
   * Sen an interval to sync the badge.
   */
  syncBadge: function(win, doc) {
    var notifCountRegex = /\((\d)\)/;
    var keepStateRegex = /.*messaged you.*/;

    setInterval(function() {
      if (keepStateRegex.test(doc.title)) {
        // This prevents the badge from blinking at the same time with the title
        return;
      }

      var countMatch = notifCountRegex.exec(doc.title);
      var label = countMatch && countMatch[1] || '';
      win.setBadgeLabel(label);
    }, 50);
  },

  /**
   * Store the window state.
   */
  saveWindowState: function(win) {
    var state = {
      mode: win.sizeMode || 'normal'
    };

    if (state.mode == 'normal') {
      state.x = win.x;
      state.y = win.y;
      state.width = win.width;
      state.height = win.height;
    }

    settings.windowState = state;
  },

  /**
   * Restore the window size and position.
   */
  restoreWindowState: function(win) {
    var state = settings.windowState;

    if (state.mode == 'maximized') {
      win.maximize();
    } else {
      win.resizeTo(state.width, state.height);
      win.moveTo(state.x, state.y);
    }

    win.show();
  }
};
