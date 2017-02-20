/*===============================
* FILE:   scriptures.js
* AUTHOR: Ali Wilkin (copied from Stephen Liddle)
* DATE:   13 Feb 2017
*
* DESCRIPTION: This module contains the JS front-end code for
* the project Scriptures Mapped. IS 542, Winter 2017, BYU.
*/

/*property
    ajax, bookById, books, dataType, error, forEach, fullName, gridName, hash,
    html, id, init, length, location, log, maxBookId, minBookId, nextChapter,
    numChapters, onHashChanged, parentBookId, prevChapter, push, slice, split,
    substring, success, tocName, url, urlForScriptureChapter, volumes
*/
/*global $, Number, console, window*/
/*jslint es6 browser: true */



let Scriptures = (function () {
    // Force the browser into JavaScript strict compliance mode
    "use strict";

    /* ------------------------------
    *         CONSTANTS
    */

    const ANIMATION_DURATION = 700;

    const SCRIPTURES_URL = "http://scriptures.byu.edu/mapscrip/mapgetscrip.php";


    /* ------------------------------
    *         PRIVATE VARIABLES
    */
    // Object to keep track of elements we're animating
    let animatingElements = {};

    // Main data structure of all book objects.
    let books;

    // Breadcrumbs for the request that is in progress
    let requestedBreadcrumbs;

    // Next/previous links for the request that is in progress
    let requestedNextPrev;

    // This object holds the books that are top-level "volumes".
    let volumeArray;

  /* ------------------------------
  *         PRIVATE METHODS
  */

    function bookChapterValid (bookId, chapter) {
        let book = books[bookId];

        if (book === undefined || chapter < 0 || chapter > book.numChapters) {
            return false;
        }

        if (chapter === 0 && book.numChapters > 0) {
            return false;
        }

        return true;
    }

    function breadcrumbs (volume, book, chapter) {
        let crumbs = "<ul><li>";

        if (volume === undefined) {
            crumbs += "The Scriptures</li>";
        } else {
            crumbs += "<a href=\"javascript:void(0);\" onclick=\"Scriptures.hash()\">The Scriptures</a></li>";

            if (book === undefined) {
                crumbs += "<li>" + volume.fullName + "</li>";
            } else {
                crumbs += "<li><a href=\"javascript:void(0);\" onclick=\"Scriptures.hash(" + volume.id + ")\">" + volume.fullName + "</a></li>";

                if (chapter === undefined || chapter === 0) {
                    crumbs += "<li>" + book.tocName + "</li>";
                } else {
                    crumbs += "<li><a href=\"javascript:void(0);\" onclick=\"Scriptures.hash(0, " + book.id + ")\">" + book.tocName + "</a></li>";
                    crumbs += "<li>" + chapter + "</li>";
                }
            }
        }

        return crumbs + "</ul>";
    }

    function cacheBooks () {
        volumeArray.forEach(function (volume) {
            let volumeBooks = [];
            let bookId = volume.minBookId;

            while (bookId <= volume.maxBookId) {
                volumeBooks.push(books[bookId]);
                bookId += 1;
            }

            volume.books = volumeBooks;
        });
    }

    function encodedScriptureUrlParameters (bookId, chapter, verses, isJst) {
        if (bookId !== undefined && chapter !== undefined) {
            let options = "";
            if (verses !== undefined) {
                options += verses;
            }

            if (isJst !== undefined && isJst) {
                options += "&jst=JST";
            }

            return SCRIPTURES_URL + "?book=" + bookId + "&chap=" + chapter + "&verses=" + options;
        }
    }

    function transitionBreadcrumbs (newCrumbs) {
      if (animatingElements.hasOwnProperty("crumbsIn") || animatingElements.hasOwnProperty("crumbsOut")) {
          window.setTimeout(transitionBreadcrumbs, 200, newCrumbs);
          return;
      }
      let crumbs = $("#crumb ul");

      newCrumbs = $(newCrumbs);

      if (crumbs.length > 0) {
          $("#crumb").html(newCrumbs);

          animatingElements.crumbsOut = crumbs;
          crumbs.animate({
              opacity: 0
          }, {
              queue: false,
              duration: ANIMATION_DURATION,
              complete: function () {
                  crumbs.remove();
                  delete animatingElements.crumbsOut;
              }
          });

          animatingElements.crumbsIn = crumbs;
          newCrumbs.css({opacity:0}).appendTo("#crumb");
          newCrumbs.animate({
              opacity: 1
          },{
              queue: false,
              duration: ANIMATION_DURATION,
              complete: function () {
                delete animatingElements.crumbsIn;
              }
          });
      } else {
          $("#crumb").html(newCrumbs);
      }
    }

    function transitionScriptures (newContent) {
        if (animatingElements.hasOwnProperty("scripIn") || animatingElements.hasOwnProperty("scripOut")) {
            window.setTimeout(transitionScriptures, 200, newContent);
            return;
        }

        let content = $("#scriptures *");

        newContent = $(newContent);

        if (content.length > 0) {
            // Animate the transition to the new scripture content
            animatingElements.scriptOut = content;
            content.animate({
                opacity: 0
            }, {
                queue: false,
                duration: ANIMATION_DURATION,
                complete: function () {
                    content.remove();
                    delete animatingElements.scripOut;
                }
            });

            animatingElements.scriptIn = newContent;
            newContent.css({opacity:0}).appendTo("#scriptures");
            newContent.animate({
                opacity: 1
            }, {
                queue: false,
                duration: ANIMATION_DURATION,
                complete: function () {
                    delete animatingElements.scripOut;
                }
            });
        } else {
            $("#scriptures").html(newContent);
        }
    }

    function getScriptureCallback (html) {
        html = $(html);
        html.find(".navheading").append("<div class=\"nextprev\">" + requestedNextPrev + "</div>");

        transitionBreadcrumbs(requestedBreadcrumbs);
        transitionScriptures(html);
    }

    function getScriptureFailed () {
        console.log("Warning: scripture request from server failed.");
    }

    function titleForBookChapter(book, chapter) {
        return book.tocName + (chapter > 0 ? " " + chapter : "");
    }

    // Book ID and chapter must be integers
    // Returns undefined if there's no previous chapter
    function nextChapter(bookId, chapter) {
        let book = books[bookId];

        if (book !== undefined) {
            if (chapter < book.numChapters) {
                return [bookId, chapter + 1, titleForBookChapter(book, chapter + 1)];
            }

            let nextBook = books[bookId + 1];

            if (nextBook !== undefined) {
                let nextChapterValue = 0;

                if (nextBook.numChapters > 0) {
                    nextChapterValue = 1;
                }
                return [nextBook.id, nextChapterValue, titleForBookChapter(nextBook, nextChapterValue)];
            }
        }
    }

    // Book ID and chapter must be integers
    // Returns undefined if there's no previous chapter
    function prevChapter(bookId, chapter) {
        let book = books[bookId];

        if (book !== undefined) {
            if (chapter > 1) {
                return [bookId, chapter - 1, titleForBookChapter(book, chapter - 1)];
            }

            let prevBook = books[bookId - 1];

            if (prevBook !== undefined) {
                return [prevBook.id, prevBook.numChapters, titleForBookChapter(prevBook, prevBook.numChapters)];
            }
        }
    }

    function navigateChapter (bookId, chapter) {
      if (bookId !== undefined){
        let book = books[bookId];
        let volume = volumeArray[book.parentBookId - 1];

        requestedBreadcrumbs = breadcrumbs(volume, book, chapter);

        let nextPrev = prevChapter(bookId, chapter);

        if (nextPrev === undefined) {
            requestedNextPrev = "";
        } else {
            requestedNextPrev = "<a href=\"javascript:void(0);\" onclick=\"Scriptures.hash(0, " + nextPrev[0] + ", " + nextPrev[1] + ")\" title = \"" + nextPrev[2] + "\"><i class=\"material-icons\">skip_previous</i></a>";
        }

        nextPrev = nextChapter(bookId, chapter);

        if (nextPrev !== undefined) {
            requestedNextPrev += "<a href=\"javascript:void(0);\" onclick=\"Scriptures.hash(0, " + nextPrev[0] + ", " + nextPrev[1] + ")\" title = \"" + nextPrev[2] + "\"><i class=\"material-icons\">skip_next</i></a>";
        }

        $.ajax({
          "url": encodedScriptureUrlParameters(bookId, chapter),
          "success": getScriptureCallback,
          "error": getScriptureFailed
        });
      }
    }

    function navigateBook (bookId) {
        let book = books[bookId];
        let volume = volumeArray[book.parentBookId - 1];

        if (book.numChapters <= 0) {
            navigateChapter(book.id, 0);
        } else if (book.numChapters === 1) {
            navigateChapter(book.id, 1);
        } else {
            let chapter = 1;
            let navContents = "<div id=\"scripnav\"><div class=\"volume\"><h5>" + book.fullName + "</h5></div><div class=\"books\">";

            while (chapter <= book.numChapters) {
                navContents += "<a class=\"waves-effect waves-custom waves-ripple btn chapter\" id=\"" + chapter + "\" href=\"#0:" + book.id + ":" + chapter + "\">" + chapter + "</a>";
                chapter += 1;
            }

            navContents += "</div>";
            transitionScriptures(navContents);
            transitionBreadcrumbs(breadcrumbs(volume, book));
        }
    }

    function navigateHome (volumeId) {
        let displayedVolume;
        let navContents = "<div id=\"scripnav\">";

        Scriptures.volumes().forEach(function (volume) {
            if (volumeId === undefined || volume.id === volumeId) {
                navContents += "<div class=\"volume\"><a name=\"v" + volume.id + "\" /><h5>" + volume.fullName + "</h5></div><div class=\"books\">";

                volume.books.forEach(function (book) {
                    navContents += "<a class=\"waves-effect waves-custom waves-ripple btn\" id=\"" + book.id + "\" href=\"#" + volume.id + ":" + book.id + "\">" + book.gridName + "</a>";
                });
                navContents += "</div>";

                if (volume.id === volumeId) {
                    displayedVolume = volume;
                }
            }
        });

        navContents += "<br /><br /></div>";

        transitionScriptures(navContents);
        transitionBreadcrumbs(breadcrumbs(displayedVolume));
    }

  /* ------------------------------
  *         PUBLIC API
  */

    const publicInterface = {
        bookById(bookId) {
            return books[bookId];
        },

        hash(volumeId, bookId, chapter) {
            let newHash = "";

            if (volumeId !== undefined) {
                newHash += volumeId;

                if (bookId !== undefined) {
                    newHash += ":" + bookId;

                    if (chapter !== undefined) {
                        newHash += ":" + chapter;
                    }
                }
            }


            window.location.hash = newHash;
        },

        init(callback) {
            let booksLoaded = false;
            let volumesLoaded = false;

            $.ajax({
                "url": "http://scriptures.byu.edu/mapscrip/model/books.php",
                "dataType": "json",
                "success": function (data) {
                    books = data;
                    booksLoaded = true;

                    if (volumesLoaded) {
                        cacheBooks();

                        if (typeof callback === "function") {
                            callback();
                        }
                    }
                }
            });

            $.ajax({
                "url": "http://scriptures.byu.edu/mapscrip/model/volumes.php",
                "dataType": "json",
                "success": function (data) {
                    volumeArray = data;
                    volumesLoaded = true;

                    if (booksLoaded) {
                        cacheBooks();

                        if (typeof callback === "function") {
                            callback();
                        }
                    }
                }
            });
        },

        onHashChanged() {
            let bookId;
            let chapter;
            let ids = [];
            if (window.location.hash !== "" && window.location.hash.length > 1) {
                // Remove leading # and split string on colon delimiters
                ids = window.location.hash.substring(1).split(":");
            }

            if (ids.length <= 0) {
                navigateHome();
            } else if (ids.length === 1) {
                // Show single volume's table of contents
                let volumeId = Number(ids[0]);

                if (volumeId < volumeArray[0].id || volumeId > volumeArray[volumeArray.length - 1].id) {
                    navigateHome();
                } else {
                    navigateHome(volumeId);
                }
            } else if (ids.length === 2) {
                // Show book's list of chapters
                let bookId = Number(ids[1]);

                if (books[bookId] === undefined) {
                    navigateHome();
                } else {
                  navigateBook(bookId);
                }

            } else {
                // Display a specific chapter
                let bookId = Number(ids[1]);
                let chapter = Number(ids[2]);

                if (!bookChapterValid(bookId, chapter)) {
                    navigateHome();
                } else {
                    navigateChapter(bookId, chapter);
                }
            }
        },

        urlForScriptureChapter(bookId, chapter, verses, isJst) {
            let book = books[bookId];

            if (book !== undefined) {
                if ((chapter === 0 && book.numChapters === 0) || (chapter > 0 && chapter <= book.numChapters)) {
                    return encodedScriptureUrlParameters(bookId, chapter, verses, isJst);
                }
            }
        },

        volumes() {
            return volumeArray.slice();
        }
    };

    return publicInterface;
}());
