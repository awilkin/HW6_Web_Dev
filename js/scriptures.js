/*property
    abbr, ajax, backName, bookById, books, citeAbbr, citeFull, dataType, forEach, fullName,
    gridName, id, init, jstTitle, maxBookId, minBookId, nextChapter, numChapters,
    parentBookId, prevChapter, push, slice, subdiv, success, tocName,
    url, urlForScriptureChapter, urlPath, volumes, webTitle
*/
/*global $ */
/*jslint es6 browser: true
*/



let Scriptures = (function () {
    // Force the browser into JavaScript strict compliance mode
    "use strict";

    /* ------------------------------
    *         PRIVATE VARIABLES
    */

    // Main data structure of all book objects.
    let books;

    // This object holds the books that are top-level "volumes".
    let volumeArray;

  /* ------------------------------
  *         PRIVATE METHODS
  */
    const encodedScriptureUrlParameters = function (bookId, chapter, verses, isJst) {
        let options = "";

        if (bookId !== undefined && chapter !== undefined) {
            if (verses !== undefined) {
                options += verses;
            }

            if (isJst !== undefined && isJst) {
                options += "&jst=JST";
            }

            return "http://scriptures.byu.edu/scriptures/scriptures_ajax/" + bookId + "/" + chapter + "?verses=" + options;
        }
    };

  /* ------------------------------
  *         PRE-PROCESSING
  */
    let cacheBooks = function () {
        volumeArray.forEach(function (volume) {
            let volumeBooks = [];
            let bookId = volume.minBookId;

            while (bookId <= volume.maxBookId) {
                volumeBooks.push(books[bookId]);
                bookId += 1;
            }

            volume.books = volumeBooks;
        });
    };


  /* ------------------------------
  *         PUBLIC API
  */

    const publicInterface = {
        bookById(bookId) {
            return books[bookId];
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

        navigateHome() {          
            let newBody="";

            Scriptures.volumes().forEach(function (volume) {
                newBody += "<p class=\"volume\">" + volume.fullName + "</p><ul>";

                volume.books.forEach(function (book) {
                    newBody += "<li class=\"book\">" + book.fullName + "</li>";
                });
                newBody += "</ul>";
            });

            $("#scriptures").html(newBody);
        },

        // Book ID and chapter must be integers
        // Returns undefined if there's no previous chapter
        nextChapter(bookId, chapter) {
            let book = books[bookId];

            if (book !== undefined) {
                if (chapter < book.numChapters) {
                    return [bookId, chapter + 1];
                }

                let nextBook = books[bookId + 1];

                if (nextBook !== undefined) {
                    let nextChapter = 0;

                    if (nextBook.numChapters > 0) {
                        nextChapter = 1;
                    }
                    return [nextBook.id, nextChapter];
                }
            }
        },

        onHashChanged () {
            let bookId;
            let chapter;
            let ids = [];
            let volumeId;
            if (window.location.hash !== "" && window.location.hash.length > 1) {
                // Remove leading # and split string on colon delimiters
                ids = window.location.hash.substring(1).split(":");
            }

            if (ids.length <= 0) {
                navigateHome();
            }

        },

    // Book ID and chapter must be integers
    // Returns undefined if there's no previous chapter
        prevChapter(bookId, chapter) {
            let book = books[bookId];

            if (book !== undefined) {
                if (chapter > 1) {
                    return [bookId, chapter - 1];
                }

                let prevBook = books[bookId - 1];

                if (prevBook !== undefined) {
                    return [prevBook.id, prevBook.numChapters];
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
