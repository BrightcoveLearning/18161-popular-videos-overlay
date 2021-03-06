videojs.registerPlugin('popularVideosOverlay', function() {
    'use strict';
    var player = this,
        apiRequest = document.getElementById('apiRequest'),
        responseData = document.getElementById('responseData'),
        // This var needs to be in the function scope because
        // multiple functions will access it
    		videoData = [],
        // Build options needed for Analytics API request
        options = {},
        baseURL = "https://analytics.api.brightcove.com/v1/data",
        accountId = "1752604059001";

      options.proxyURL = "https://solutions.brightcove.com/bcls/bcls-proxy/brightcove-learning-proxy-v2.php";
      options.requestType = "GET";

      /**
       * Loads and plays a video
       * This function called when thumbnails in the overlay are clicked
       * @param {integer} idx the index of the video object in the videoData array
       */
      loadAndPlay = function(idx) {
        player.catalog.load(videoData[idx]);
        player.play();
      }

      /**
       * Create an element
       *
       * @param  {string} type - the element type
       * @param  {object} attributes - attributes to add to the element
       * @return {HTMLElement} the HTML element
       */
      function createEl(type, attributes) {
        var el,
          attr;
        el = document.createElement(type);
        if (attributes !== null) {
          for (attr in attributes) {
            el.setAttribute(attr, attributes[attr]);
          }
          return el;
        }
      }

      /**
       * Adds text content to an element
       * @param {HTMLElement} el the element
       * @param {string} str the text content
       */
      function addText(el, str) {
        el.appendChild(document.createTextNode(str));
      }

      /**
       * Extract video ids from Analytics API response
       * @param {array} aapiData the data from the Analytics API
       * @return {array} videoIds array of video ids
       */
      function extractVideoIds(aapiData) {
        var i,
          iMax = aapiData.items.length,
          videoIds = [];
        for (i = 0; i < iMax; i++) {
          if (aapiData.items[i].video !== null) {
            videoIds.push(aapiData.items[i].video);
          }
        }
        return videoIds;
      }

      /**
       * Get video objects
       * @param {array} videoIds array of video ids
       * @return {array} videoData array of video objects
       */
      function getVideoData(videoIds, callback) {
        var i = 0,
          iMax = videoIds.length;

        /**
         * Makes catalog calls for all video ids in the array
         */
        getVideo();

        function getVideo() {
          if (i < iMax) {
            player.catalog.getVideo(videoIds[i], pushData);
          } else {
            callback(videoData);
          }

        }
        /**
         * Callback for the catalog calls
         * Pushes the returned data object into an array
         * @param {string} error error returned if the call fails
         * @parap {object} video the video object
         */
        function pushData(error, video) {
          videoData.push(video);
          i++;
          getVideo();
        }
      }

      /**
       * Create the html for the overlay
       * @param {array} videoData array of video objects
       * @return {HTMLElement} videoList the div element containing the overlay
       */
      function createVideoList(videoData) {
        var i,
          iMax = videoData.length,
          videoList = createEl('div', {
            id: 'videoList'
          }),
          videoHeader = createEl('h1', {
            style: 'color:#666600;font-size: 2em;margin-bottom:.5em'
          }),
          videoWrapper = createEl('div'),
          thumbnailLink,
          thumbnailImage;
        addText(videoHeader, 'Popular Videos');
        videoList.appendChild(videoHeader);
        videoList.appendChild(videoWrapper);
        for (i = 0; i < iMax; i++) {
          thumbnailLink = createEl('a', {
            href: 'javascript:loadAndPlay(' + i + ')'
          })
          thumbnailImage = createEl('img', {
            class: 'video-thumbnail',
            src: videoData[i].thumbnail
          });
          videoWrapper.appendChild(thumbnailLink);
          thumbnailLink.appendChild(thumbnailImage);
        }
        return videoList;
      }

      /**
       * Sets up the data for the API request
       */
      function setRequestData() {
        var endPoint = '',
          // Get the epoch time in milliseconds 24 hours ago
          // 12 hours in milliseconds = 1000 * 24 * 60 * 60 = 86,400,000
          yesterday = new Date().valueOf() - 86400000,
          requestData = {};
        // Note that we don't have to set the "to date" to now because that's the default
        endPoint = '?accounts=' + accountId + '&dimensions=video&sort=-video_view&limit=6&from=' + yesterday;
        options.url = baseURL + endPoint;
        // Display request URL
        apiRequest.textContent = options.url;
      }

      // +++ Makes actual call for data +++
/**
  * send API request to the proxy
  * @param  {Object} options for the request
  * @param  {String} options.url the full API request URL
  * @param  {String="GET","POST","PATCH","PUT","DELETE"} requestData [options.requestType="GET"] HTTP type for the request
  * @param  {String} options.proxyURL proxyURL to send the request to
  * @param  {String} options.client_id client id for the account (default is in the proxy)
  * @param  {String} options.client_secret client secret for the account (default is in the proxy)
  * @param  {JSON} [options.requestBody] Data to be sent in the request body in the form of a JSON string
  * @param  {Function} [callback] callback function that will process the response
  */
  function makeRequest(options, callback) {
    var httpRequest = new XMLHttpRequest(),
        response,
        requestParams,
        dataString,
        proxyURL = options.proxyURL,
        // response handler
        getResponse = function() {
          try {
            if (httpRequest.readyState === 4) {
              if (httpRequest.status >= 200 && httpRequest.status < 300) {
                response = httpRequest.responseText;
                // some API requests return '{null}' for empty responses - breaks JSON.parse
                if (response === "{null}") {
                  response = null;
                }
                // return the response
                callback(response);
              } else {
                alert(
                  "There was a problem with the request. Request returned " +
                  httpRequest.status
                );
              }
            }
          } catch (e) {
            alert("Caught Exception: " + e);
          }
        };
     /**
       * set up request data
         * the proxy used here takes the following request body:
         * JSON.strinify(options)
         */
    // set response handler
    httpRequest.onreadystatechange = getResponse;
    // open the request
    httpRequest.open("POST", proxyURL);
    // set headers if there is a set header line, remove it
    // open and send request
    httpRequest.send(JSON.stringify(options));
  }

  /**
   * Acts as a controller for the rest of the script
   */
   player.one('loadstart', function() {
     var requestData = {},
       videoIds = [],
       videoList,
       overlayDiv = createEl('div'),
       JSONanalyticsData;

     // Set up data for Analytics API request
     setRequestData();
     // +++ Make the Analytics API request +++
     makeRequest(options, function (analyticsData) {
       // Convert response string into JSON
       JSONanalyticsData = JSON.parse(analyticsData);
       // Display response data
       responseData.textContent = JSON.stringify(JSONanalyticsData, null, '  ');
       // Extract the video ids into an array
       videoIds = extractVideoIds(JSONanalyticsData);
       // Use the catalog to get the video data
       getVideoData(videoIds, function() {
         // Generate the HTML for the overlay
         videoList = createVideoList(videoData);
         // Add the overlay
         overlayDiv.appendChild(videoList);
         player.overlay({
           overlays: [{
             align: 'top',
             content: overlayDiv,
             start: 'pause',
             end: 'play'
           }]
         });
       });
     });
   });

});
