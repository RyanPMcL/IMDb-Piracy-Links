// ==UserScript==
// @name        IMDb Piracy Links
// @description A script to easily access piracy related links on IMDb pages.
// @version     Alpha-5
// @author      Ryan McLaughlin
// @namespace   https://ryan-mclaughlin.ca
// @updateURL   https://raw.githubusercontent.com/RyanPMcL/IMDb-Piracy-Links/refs/heads/main/IMDbPL.user.js
// @downloadURL https://raw.githubusercontent.com/RyanPMcL/IMDb-Piracy-Links/refs/heads/main/IMDbPL.user.js
// @match       *://*.imdb.com/title/tt*
// @connect     *
// @require     https://unpkg.com/preact@10.25.4/dist/preact.umd.js
// @require     https://unpkg.com/preact@10.25.4/hooks/dist/hooks.umd.js
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       GM.xmlHttpRequest
// ==/UserScript==

(function (preact, hooks) {
  "use strict";
  const GM_CONFIG_KEY = "config";
  const DEFAULT_CONFIG = {
    enabled_sites: [],
    fetch_results: true,
    open_blank: true
  };
  const CATEGORIES = {
    movie: "Movie",
    tv: "TV",
  };
  const FETCH_STATE = {
    LOADING: 0,
    NO_RESULTS: 1,
    RESULTS_FOUND: 2,
    NO_ACCESS: 3,
    TIMEOUT: 4,
    ERROR: 5,
  };
  
  const imgs = {
    img$setting: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ij48cGF0aCBkPSJNOCAwYTguMiA4LjIgMCAwIDEgLjcwMS4wMzFDOS40NDQuMDk1IDkuOTkuNjQ1IDEwLjE2IDEuMjlsLjI4OCAxLjEwN2MuMDE4LjA2Ni4wNzkuMTU4LjIxMi4yMjQuMjMxLjExNC40NTQuMjQzLjY2OC4zODYuMTIzLjA4Mi4yMzMuMDkuMjk5LjA3MWwxLjEwMy0uMzAzYy42NDQtLjE3NiAxLjM5Mi4wMjEgMS44Mi42My4yNy4zODUuNTA2Ljc5Mi43MDQgMS4yMTguMzE1LjY3NS4xMTEgMS40MjItLjM2NCAxLjg5MWwtLjgxNC44MDZjLS4wNDkuMDQ4LS4wOTguMTQ3LS4wODguMjk0LjAxNi4yNTcuMDE2LjUxNSAwIC43NzItLjAxLjE0Ny4wMzguMjQ2LjA4OC4yOTRsLjgxNC44MDZjLjQ3NS40NjkuNjc5IDEuMjE2LjM2NCAxLjg5MWE3Ljk3NyA3Ljk3NyAwIDAgMS0uNzA0IDEuMjE3Yy0uNDI4LjYxLTEuMTc2LjgwNy0xLjgyLjYzbC0xLjEwMi0uMzAyYy0uMDY3LS4wMTktLjE3Ny0uMDExLS4zLjA3MWE1LjkwOSA1LjkwOSAwIDAgMS0uNjY4LjM4NmMtLjEzMy4wNjYtLjE5NC4xNTgtLjIxMS4yMjRsLS4yOSAxLjEwNmMtLjE2OC42NDYtLjcxNSAxLjE5Ni0xLjQ1OCAxLjI2YTguMDA2IDguMDA2IDAgMCAxLTEuNDAyIDBjLS43NDMtLjA2NC0xLjI4OS0uNjE0LTEuNDU4LTEuMjZsLS4yODktMS4xMDZjLS4wMTgtLjA2Ni0uMDc5LS4xNTgtLjIxMi0uMjI0YTUuNzM4IDUuNzM4IDAgMCAxLS42NjgtLjM4NmMtLjEyMy0uMDgyLS4yMzMtLjA5LS4yOTktLjA3MWwtMS4xMDMuMzAzYy0uNjQ0LjE3Ni0xLjM5Mi0uMDIxLTEuODItLjYzYTguMTIgOC4xMiAwIDAgMS0uNzA0LTEuMjE4Yy0uMzE1LS42NzUtLjExMS0xLjQyMi4zNjMtMS44OTFsLjgxNS0uODA2Yy4wNS0uMDQ4LjA5OC0uMTQ3LjA4OC0uMjk0YTYuMjE0IDYuMjE0IDAgMCAxIDAtLjc3MmMuMDEtLjE0Ny0uMDM4LS4yNDYtLjA4OC0uMjk0bC0uODE1LS44MDZDLjYzNSA2LjA0NS40MzEgNS4yOTguNzQ2IDQuNjIzYTcuOTIgNy45MiAwIDAgMSAuNzA0LTEuMjE3Yy40MjgtLjYxIDEuMTc2LS44MDcgMS44Mi0uNjNsMS4xMDIuMzAyYy4wNjcuMDE5LjE3Ny4wMTEuMy0uMDcxLjIxNC0uMTQzLjQzNy0uMjcyLjY2OC0uMzg2LjEzMy0uMDY2LjE5NC0uMTU4LjIxMS0uMjI0bC4yOS0xLjEwNkM2LjAwOS42NDUgNi41NTYuMDk1IDcuMjk5LjAzIDcuNTMuMDEgNy43NjQgMCA4IDBabS0uNTcxIDEuNTI1Yy0uMDM2LjAwMy0uMTA4LjAzNi0uMTM3LjE0NmwtLjI4OSAxLjEwNWMtLjE0Ny41NjEtLjU0OS45NjctLjk5OCAxLjE4OS0uMTczLjA4Ni0uMzQuMTgzLS41LjI5LS40MTcuMjc4LS45Ny40MjMtMS41MjkuMjdsLTEuMTAzLS4zMDNjLS4xMDktLjAzLS4xNzUuMDE2LS4xOTUuMDQ1LS4yMi4zMTItLjQxMi42NDQtLjU3My45OS0uMDE0LjAzMS0uMDIxLjExLjA1OS4xOWwuODE1LjgwNmMuNDExLjQwNi41NjIuOTU3LjUzIDEuNDU2YTQuNzA5IDQuNzA5IDAgMCAwIDAgLjU4MmMuMDMyLjQ5OS0uMTE5IDEuMDUtLjUzIDEuNDU2bC0uODE1LjgwNmMtLjA4MS4wOC0uMDczLjE1OS0uMDU5LjE5LjE2Mi4zNDYuMzUzLjY3Ny41NzMuOTg5LjAyLjAzLjA4NS4wNzYuMTk1LjA0NmwxLjEwMi0uMzAzYy41Ni0uMTUzIDEuMTEzLS4wMDggMS41My4yNy4xNjEuMTA3LjMyOC4yMDQuNTAxLjI5LjQ0Ny4yMjIuODUuNjI5Ljk5NyAxLjE4OWwuMjg5IDEuMTA1Yy4wMjkuMTA5LjEwMS4xNDMuMTM3LjE0NmE2LjYgNi42IDAgMCAwIDEuMTQyIDBjLjAzNi0uMDAzLjEwOC0uMDM2LjEzNy0uMTQ2bC4yODktMS4xMDVjLjE0Ny0uNTYxLjU0OS0uOTY3Ljk5OC0xLjE4OS4xNzMtLjA4Ni4zNC0uMTgzLjUtLjI5LjQxNy0uMjc4Ljk3LS40MjMgMS41MjktLjI3bDEuMTAzLjMwM2MuMTA5LjAyOS4xNzUtLjAxNi4xOTUtLjA0NS4yMi0uMzEzLjQxMS0uNjQ0LjU3My0uOTkuMDE0LS4wMzEuMDIxLS4xMS0uMDU5LS4xOWwtLjgxNS0uODA2Yy0uNDExLS40MDYtLjU2Mi0uOTU3LS41My0xLjQ1NmE0LjcwOSA0LjcwOSAwIDAgMCAwLS41ODJjLS4wMzItLjQ5OS4xMTktMS4wNS41My0xLjQ1NmwuODE1LS44MDZjLjA4MS0uMDguMDczLS4xNTkuMDU5LS4xOWE2LjQ2NCA2LjQ2NCAwIDAgMC0uNTczLS45ODljLS4wMi0uMDMtLjA4NS0uMDc2LS4xOTUtLjA0NmwtMS4xMDIuMzAzYy0uNTYuMTUzLTEuMTEzLjAwOC0xLjUzLS4yN2E0LjQ0IDQuNDQgMCAwIDAtLjUwMS0uMjljLS40NDctLjIyMi0uODUtLjYyOS0uOTk3LTEuMTg5bC0uMjg5LTEuMTA1Yy0uMDI5LS4xMS0uMTAxLS4xNDMtLjEzNy0uMTQ2YTYuNiA2LjYgMCAwIDAtMS4xNDIgMFpNMTEgOGEzIDMgMCAxIDEtNiAwIDMgMyAwIDAgMSA2IDBaTTkuNSA4YTEuNSAxLjUgMCAxIDAtMy4wMDEuMDAxQTEuNSAxLjUgMCAwIDAgOS41IDhaIj48L3BhdGg+PC9zdmc+",
    img$load: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ij48cGF0aCBkPSJNMCA4YTggOCAwIDEgMSAxNiAwQTggOCAwIDAgMSAwIDhabTgtNi41YTYuNSA2LjUgMCAxIDAgMCAxMyA2LjUgNi41IDAgMCAwIDAtMTNaIj48L3BhdGg+PC9zdmc+",
    img$success: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ij48cGF0aCBkPSJNOCAxNkE4IDggMCAxIDEgOCAwYTggOCAwIDAgMSAwIDE2Wm0zLjc4LTkuNzJhLjc1MS43NTEgMCAwIDAtLjAxOC0xLjA0Mi43NTEuNzUxIDAgMCAwLTEuMDQyLS4wMThMNi43NSA5LjE5IDUuMjggNy43MmEuNzUxLjc1MSAwIDAgMC0xLjA0Mi4wMTguNzUxLjc1MSAwIDAgMC0uMDE4IDEuMDQybDIgMmEuNzUuNzUgMCAwIDAgMS4wNiAwWiI+PC9wYXRoPjwvc3ZnPg==",
    img$fail: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ij48cGF0aCBkPSJNMi4zNDMgMTMuNjU3QTggOCAwIDEgMSAxMy42NTggMi4zNDMgOCA4IDAgMCAxIDIuMzQzIDEzLjY1N1pNNi4wMyA0Ljk3YS43NTEuNzUxIDAgMCAwLTEuMDQyLjAxOC43NTEuNzUxIDAgMCAwLS4wMTggMS4wNDJMNi45NCA4IDQuOTcgOS45N2EuNzQ5Ljc0OSAwIDAgMCAuMzI2IDEuMjc1Ljc0OS43NDkgMCAwIDAgLjczNC0uMjE1TDggOS4wNmwxLjk3IDEuOTdhLjc0OS43NDkgMCAwIDAgMS4yNzUtLjMyNi43NDkuNzQ5IDAgMCAwLS4yMTUtLjczNEw5LjA2IDhsMS45Ny0xLjk3YS43NDkuNzQ5IDAgMCAwLS4zMjYtMS4yNzUuNzQ5Ljc0OSAwIDAgMC0uNzM0LjIxNUw4IDYuOTRaIj48L3BhdGg+PC9zdmc+",
    img$warn: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ij48cGF0aCBkPSJNNi40NTcgMS4wNDdjLjY1OS0xLjIzNCAyLjQyNy0xLjIzNCAzLjA4NiAwbDYuMDgyIDExLjM3OEExLjc1IDEuNzUgMCAwIDEgMTQuMDgyIDE1SDEuOTE4YTEuNzUgMS43NSAwIDAgMS0xLjU0My0yLjU3NVpNOCA1YS43NS43NSAwIDAgMC0uNzUuNzV2Mi41YS43NS43NSAwIDAgMCAxLjUgMHYtMi41QS43NS43NSAwIDAgMCA4IDVabTEgNmExIDEgMCAxIDAtMiAwIDEgMSAwIDAgMCAyIDBaIj48L3BhdGg+PC9zdmc+",
    img$restriced: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ij48cGF0aCBkPSJNMCA4YTggOCAwIDEgMSAxNiAwQTggOCAwIDAgMSAwIDhabTExLjMzMy0yLjE2N2EuODI1LjgyNSAwIDAgMC0xLjE2Ni0xLjE2NmwtNS41IDUuNWEuODI1LjgyNSAwIDAgMCAxLjE2NiAxLjE2NloiPjwvcGF0aD48L3N2Zz4=",
    img$timeout: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ij48cGF0aCBkPSJNMCA4YTggOCAwIDEgMSAxNiAwQTggOCAwIDAgMSAwIDhabTguNTc1LTMuMjVhLjgyNS44MjUgMCAxIDAtMS42NSAwdjMuNWMwIC4zMzcuMjA1LjY0LjUxOS43NjZsMi41IDFhLjgyNS44MjUgMCAwIDAgLjYxMi0xLjUzMmwtMS45ODEtLjc5M1oiPjwvcGF0aD48L3N2Zz4=",
    img$info: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ij48cGF0aCBkPSJNMCA4YTggOCAwIDEgMSAxNiAwQTggOCAwIDAgMSAwIDhabTgtNi41YTYuNSA2LjUgMCAxIDAgMCAxMyA2LjUgNi41IDAgMCAwIDAtMTNaTTYuNSA3Ljc1QS43NS43NSAwIDAgMSA3LjI1IDdoMWEuNzUuNzUgMCAwIDEgLjc1Ljc1djIuNzVoLjI1YS43NS43NSAwIDAgMSAwIDEuNWgtMmEuNzUuNzUgMCAwIDEgMC0xLjVoLjI1di0yaC0uMjVhLjc1Ljc1IDAgMCAxLS43NS0uNzVaTTggNmExIDEgMCAxIDEgMC0yIDEgMSAwIDAgMSAwIDJaIj48L3BhdGg+PC9zdmc+",
    img$globe: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ij48cGF0aCBkPSJNOCAwYTggOCAwIDEgMSAwIDE2QTggOCAwIDAgMSA4IDBaTTUuNzggOC43NWE5LjY0IDkuNjQgMCAwIDAgMS4zNjMgNC4xNzdjLjI1NS40MjYuNTQyLjgzMi44NTcgMS4yMTUuMjQ1LS4yOTYuNTUxLS43MDUuODU3LTEuMjE1QTkuNjQgOS42NCAwIDAgMCAxMC4yMiA4Ljc1Wm00LjQ0LTEuNWE5LjY0IDkuNjQgMCAwIDAtMS4zNjMtNC4xNzdjLS4zMDctLjUxLS42MTItLjkxOS0uODU3LTEuMjE1YTkuOTI3IDkuOTI3IDAgMCAwLS44NTcgMS4yMTVBOS42NCA5LjY0IDAgMCAwIDUuNzggNy4yNVptLTUuOTQ0IDEuNUgxLjU0M2E2LjUwNyA2LjUwNyAwIDAgMCA0LjY2NiA1LjVjLS4xMjMtLjE4MS0uMjQtLjM2NS0uMzUyLS41NTItLjcxNS0xLjE5Mi0xLjQzNy0yLjg3NC0xLjU4MS00Ljk0OFptLTIuNzMzLTEuNWgyLjczM2MuMTQ0LTIuMDc0Ljg2Ni0zLjc1NiAxLjU4LTQuOTQ4LjEyLS4xOTcuMjM3LS4zODEuMzUzLS41NTJhNi41MDcgNi41MDcgMCAwIDAtNC42NjYgNS41Wm0xMC4xODEgMS41Yy0uMTQ0IDIuMDc0LS44NjYgMy43NTYtMS41OCA0Ljk0OC0uMTIuMTk3LS4yMzcuMzgxLS4zNTMuNTUyYTYuNTA3IDYuNTA3IDAgMCAwIDQuNjY2LTUuNVptMi43MzMtMS41YTYuNTA3IDYuNTA3IDAgMCAwLTQuNjY2LTUuNWMuMTIzLjE4MS4yNC4zNjUuMzUzLjU1Mi43MTQgMS4xOTIgMS40MzYgMi44NzQgMS41OCA0Ljk0OFoiPjwvcGF0aD48L3N2Zz4=",
  };

  const Icon = ({ className, title, type }) =>
    preact.h("img", {
      alt: `${type} icon`,
      className: className,
      src: imgs[type],
      title: title,
    });

  function styleInject(css, ref) {
    if (ref === void 0) ref = {};
    var insertAt = ref.insertAt;

    if (!css || typeof document === "undefined") {
      return;
    }

    var head = document.head || document.getElementsByTagName("head")[0];
    var style = document.createElement("style");
    style.type = "text/css";

    if (insertAt === "top") {
      if (head.firstChild) {
        head.insertBefore(style, head.firstChild);
      } else {
        head.appendChild(style);
      }
    } else {
      head.appendChild(style);
    }

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
  }

  var css_248z$6 =
    ".Options_options__5TB2e {\n  margin-top: 10px;\n}\n\n  .Options_options__5TB2e > label > span {\n    margin-left: 10px;\n}\n";
  var css$6 = { options: "Options_options__5TB2e" };
  styleInject(css_248z$6);

  const Options = ({ options }) => {
    const optionLabels = options.map(([key, title, val, setter]) =>
      preact.h(
        "label",
        {
          key: key,
        },
        preact.h("input", {
          checked: val,
          onInput: (ev) => setter(ev.target.checked),
          type: "checkbox",
        }),
        preact.h("span", null, title),
        preact.h("br", null)
      )
    );
    return preact.h(
      "div",
      {
        className: css$6.options,
      },
      optionLabels
    );
  };

  const SiteIcon = ({ className, site, title }) =>
    site.icon
      ? preact.h("img", {
          alt: site.title,
          className: className,
          src: site.icon,
          title: title,
        })
      : null;

  var css_248z$5 =
    ".Sites_searchBar__omy0k {\n  display: flex;\n  flex-direction: row;\n  margin-bottom: 1em;\n}\n\n  .Sites_searchBar__omy0k .Sites_searchInput__0o5oY {\n    background-color: rgba(255, 255, 255, 0.9);\n    border-radius: 3px;\n    border-top-color: #949494;\n    border: 1px solid #a6a6a6;\n    box-shadow: 0 1px 0 rgba(0, 0, 0, .07) inset;\n    display: flex;\n    flex-direction: row;\n    height: 24px;\n    line-height: normal;\n    outline: 0;\n    padding: 3px 7px;\n    transition: all 100ms linear;\n    width: 100%;\n}\n\n  .Sites_searchBar__omy0k .Sites_searchInput__0o5oY:focus-within {\n      background-color: #fff;\n      border-color: #e77600;\n      box-shadow: 0 0 2px 2px rgba(228, 121, 17, 0.25);\n}\n\n  .Sites_searchBar__omy0k .Sites_searchInput__0o5oY > * {\n      background-color: transparent;\n      border: none;\n      height: 16px;\n}\n\n  .Sites_searchBar__omy0k .Sites_searchInput__0o5oY > button {\n      margin: 0 0 0 0.7em;\n      padding: 0;\n}\n\n  .Sites_searchBar__omy0k .Sites_searchInput__0o5oY > input {\n      flex-grow: 1;\n      outline: none;\n      padding: 0 0 0 0.5em;\n}\n\n  .Sites_searchBar__omy0k .Sites_resultCount__xMc-y {\n    font-weight: bold;\n    margin-left: 2em;\n    min-width: 140px;\n    text-align: right;\n}\n\n  .Sites_searchBar__omy0k .Sites_resultCount__xMc-y > span {\n      color: black;\n}\n\n.Sites_siteList__4rCbT .Sites_catList__Fv8G0 {\n    display: flex;\n    flex-wrap: wrap;\n}\n\n.Sites_siteList__4rCbT .Sites_catList__Fv8G0 h4 {\n      width: 100%;\n}\n\n.Sites_siteList__4rCbT .Sites_catList__Fv8G0 label {\n      align-items: center;\n      color: #444;\n      display: flex;\n      flex-flow: row;\n      padding: 0 6px;\n      transition: color 100ms;\n      width: 25%;\n}\n\n.Sites_siteList__4rCbT .Sites_catList__Fv8G0 label:hover {\n        color: #222;\n}\n\n.Sites_siteList__4rCbT .Sites_catList__Fv8G0 label.Sites_checked__nqnSg span {\n        color: black;\n}\n\n.Sites_siteList__4rCbT .Sites_catList__Fv8G0 label .Sites_title__4rEy0 {\n        flex-grow: 1;\n        overflow: hidden;\n        text-overflow: ellipsis;\n}\n\n.Sites_siteList__4rCbT .Sites_catList__Fv8G0 label input {\n        margin-right: 4px;\n}\n\n.Sites_siteList__4rCbT .Sites_catList__Fv8G0 label .Sites_extraIcon__YYfVy {\n        height: 12px;\n        margin-left: 4px;\n        width: 12px;\n}\n\n.Sites_siteList__4rCbT .Sites_catList__Fv8G0 label .Sites_siteIcon__GRVSj {\n        flex-shrink: 0;\n        height: 16px;\n        margin-right: 6px;\n        width: 16px;\n}\n";
  var css$5 = {
    searchBar: "Sites_searchBar__omy0k",
    searchInput: "Sites_searchInput__0o5oY",
    resultCount: "Sites_resultCount__xMc-y",
    siteList: "Sites_siteList__4rCbT",
    catList: "Sites_catList__Fv8G0",
    checked: "Sites_checked__nqnSg",
    title: "Sites_title__4rEy0",
    extraIcon: "Sites_extraIcon__YYfVy",
    siteIcon: "Sites_siteIcon__GRVSj",
  };
  styleInject(css_248z$5);

  const SearchInput = ({ q, setQ }) =>
    preact.h(
      "div",
      {
        className: css$5.searchInput,
      },
      preact.h("span", null),
      preact.h("input", {
        onInput: (e) => {
          setQ(e.target.value.trim());
        },
        placeholder: "Search"
      })
    );
  const DummyIcon = ({ size }) => {
    const sizePx = `${size}px`;
    const style = {
      display: "inline-block",
      height: sizePx,
      width: sizePx,
    };
    return preact.h("div", {
      className: css$5.siteIcon,
      style: style,
    });
  };
  const SiteLabel = ({ checked, setEnabled, site }) => {
    const input = preact.h("input", {
      checked: checked,
      onInput: (e) =>
        setEnabled((prev) =>
          e.target.checked
            ? [...prev, site.id]
            : prev.filter((id) => id !== site.id)
        ),
      type: "checkbox",
    });
    const icon = site.icon
      ? preact.h(SiteIcon, {
          className: css$5.siteIcon,
          site: site,
          title: site.title,
        })
      : preact.h(DummyIcon, {
          size: 16,
        });
    const title = preact.h(
      "span",
      {
        className: css$5.title,
        title: site.title,
      },
      site.title
    );
    const extraIcons = [
      site.noAccessMatcher
        ? preact.h(Icon, {
            className: css$5.extraIcon,
            title: "Access restricted",
            type: "img$restriced",
          })
        : null,
      site.noResultsMatcher
        ? preact.h(Icon, {
            className: css$5.extraIcon,
            title: "Site supports fetching of results",
            type: "img$success",
          })
        : null,
    ];
    return preact.h(
      "label",
      {
        className: checked ? css$5.checked : null,
      },
      input,
      icon,
      " ",
      title,
      " ",
      extraIcons
    );
  };
  const CategoryList = ({ enabled, name, setEnabled, sites }) => {
    const siteLabels = sites.map((site) =>
      preact.h(SiteLabel, {
        checked: enabled.includes(site.id),
        setEnabled: setEnabled,
        site: site,
      })
    );
    return preact.h(
      "div",
      { className: css$5.catList },
      preact.h(
        "h4",
        null,
        name,
        " Torrents"
      ),
      siteLabels
    );
  };

  const Sites = ({ enabledSites, setEnabledSites, sites }) => {
    const [q, setQ] = hooks.useState("");

    const catSites = Object.keys(CATEGORIES).map((cat) => {
      const s = sites.filter((site) => site.category.includes(cat));
      if (q.length) {
        return s.filter((site) => site.title.toLowerCase().includes(q.toLowerCase()));
      }
      return s;
    });

    const cats = Object.entries(CATEGORIES).map(([cat, catName], i) =>
      catSites[i].length
        ? preact.h(CategoryList, {
            enabled: enabledSites,
            key: cat,
            name: catName,
            setEnabled: setEnabledSites,
            sites: catSites[i],
          })
        : null
    );

    const total = catSites.reduce((acc, s) => acc + s.length, 0);
    const missing = () => window.open("https://github.com/RyanPMcL/IMDb-Piracy-Links/issues/new?template=link_reqeust.yml", '_blank').focus();
    return preact.h(
      preact.Fragment,
      null,
      preact.h(
        "div",
        { className: css$5.searchBar },
        preact.h(SearchInput, { q: q, setQ: setQ }),
      ),
      preact.h("button",{onClick: missing, style: {display: total ? 'none' : 'unset', width: "100%", "font-size": "180%"},type: "button"},"Site Missing?"),
      preact.h("div", { className: css$5.siteList }, cats)
    );
  };

  var css_248z$4 =
    ".About_about__wuWQp {\n  padding: 1em 0;\n  position: relative;\n}\n\n  .About_about__wuWQp ul > li {\n    margin-bottom: 0;\n}\n\n  .About_about__wuWQp h2 {\n    font-size: 20px;\n    margin: 0.5em 0;\n}\n\n  .About_about__wuWQp > *:last-child {\n    margin-bottom: 0;\n}\n\n  .About_about__wuWQp .About_top__jQHYs {\n    text-align: center;\n}\n\n  .About_about__wuWQp .About_content__hReHO {\n    width: 61.8%;\n    margin: 0 auto;\n}\n";
  var css$4 = {
    about: "About_about__wuWQp",
    top: "About_top__jQHYs",
    content: "About_content__hReHO",
  };
  styleInject(css_248z$4);

  const About = () =>
    preact.h(
      "div",
      {
        className: css$4.about,
      },
      preact.h("h2", null, "Piracy Links v", GM.info.script.version),
      preact.h("p", null, GM.info.script.description),
      preact.h("h2", null, "License"),
      preact.h(
        "p",
        null,
        "This script is licensed under the terms of the ",
        preact.h(
          "a",
          {
            target: "_blank",
            rel: "noreferrer",
            href: "https://github.com/RyanPMcL/IMDb-Piracy-Links/blob/master/LICENSE",
          },
          "GPL-2.0 License"
        )
      )
    );

  var css_248z$3 =
    '.Config_popover__qMfu9 {\n  background-color: #a5a5a5;\n  border-radius: 4px;\n  box-shadow: 0 0 2em rgba(0, 0, 0, 0.1);\n  color: #333;\n  display: block;\n  font-family: Verdana, Arial, sans-serif;\n  font-size: 11px;\n  left: calc(-390px + 35px);\n  line-height: 1.5rem;\n  padding: 10px;\n  position: absolute;\n  top: calc(20px + 8px);\n  white-space: nowrap;\n  width: 390px;\n  z-index: 100;\n}\n.Config_popover__qMfu9:before {\n    border-bottom: 8px solid #a5a5a5;\n    border-left: 8px solid transparent;\n    border-right: 8px solid transparent;\n    border-top: 8px solid transparent;\n    content: "";\n    display: block;\n    height: 8px;\n    right: calc(35px - 2 * 8px);\n    position: absolute;\n    top: calc(-2 * 8px);\n    width: 0;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK {\n    display: flex;\n    flex-direction: column;\n    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.2);\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_top__6DKJ8 {\n      display: flex;\n      flex-direction: row;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_top__6DKJ8 .Config_link__GTbGq {\n        flex-grow: 1;\n        text-align: right;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_top__6DKJ8 .Config_link__GTbGq > a {\n          color: #333;\n          margin-left: 12px;\n          margin-right: 4px;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_top__6DKJ8 .Config_link__GTbGq > a:visited {\n            color: #333;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_top__6DKJ8 > button {\n        background-color: rgba(0, 0, 0, 0.05);\n        border-bottom-left-radius: 0;\n        border-bottom-right-radius: 0;\n        border-bottom: transparent;\n        border-left: 1px solid rgba(0, 0, 0, 0.25);\n        border-right: 1px solid rgba(0, 0, 0, 0.25);\n        border-top-left-radius: 2px;\n        border-top-right-radius: 2px;\n        border-top: 1px solid rgba(0, 0, 0, 0.25);\n        color: #424242;\n        font-size: 12px;\n        margin: 0 6px 0 0;\n        outline: none;\n        padding: 0 6px;\n        transform: translateY(1px);\n        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.2);\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_top__6DKJ8 > button:hover {\n          background-color: rgba(0, 0, 0, 0.1);\n          color: #222;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_top__6DKJ8 > button.Config_active__vD-Fl {\n          background-color: #c2c2c2;\n          color: #222;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_top__6DKJ8 > button:last-child {\n          margin-right: 0;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_top__6DKJ8 > button > img {\n          vertical-align: text-bottom;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_body__wtDKH {\n      background-color: #c2c2c2;\n      border-bottom-left-radius: 2px;\n      border-bottom-right-radius: 2px;\n      border-top-right-radius: 2px;\n      border: 1px solid rgba(0, 0, 0, 0.25);\n      padding: 12px 10px 12px;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_body__wtDKH > div {\n        overflow: hidden;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_body__wtDKH > div > *:first-child {\n          margin-top: 0;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_body__wtDKH > div > *:last-child {\n          margin-bottom: 0;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_controls__-N2ev {\n      display: flex;\n      flex-direction: row;\n      margin-top: 10px;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_controls__-N2ev > div:first-child {\n        flex-grow: 1;\n}\n.Config_popover__qMfu9 .Config_inner__oVRAK .Config_controls__-N2ev button {\n        padding-bottom: 0;\n        padding-top: 0;\n        margin-right: 12px;\n}\n';
  var css$3 = {
    popover: "Config_popover__qMfu9",
    inner: "Config_inner__oVRAK",
    top: "Config_top__6DKJ8",
    link: "Config_link__GTbGq",
    active: "Config_active__vD-Fl",
    body: "Config_body__wtDKH",
    controls: "Config_controls__-N2ev",
  };
  styleInject(css_248z$3);

  const OPTIONS = [
    ["open_blank", "Open links in new tab"],
    ["fetch_results", "Automatically fetch results"],
  ];
  const Config = ({ config, layout, setConfig, setShow, show, sites }) => {
    const [enabledSites, setEnabledSites] = hooks.useState(
      config.enabled_sites
    );
    const openBlankArr = hooks.useState(config.open_blank);
    const fetchResultsArr = hooks.useState(config.fetch_results);
    const [openBlank, setOpenBlank] = openBlankArr;
    const [fetchResults, setFetchResults] = fetchResultsArr;
    const optStates = [openBlankArr, fetchResultsArr];
    const options = OPTIONS.map((opt, i) => [...opt, ...optStates[i]]);
    const [tab, setTab] = hooks.useState(0);
    const tabs = [
      {
        title: "Sites",
        icon: "img$globe",
        comp: preact.h(Sites, {
          enabledSites: enabledSites,
          setEnabledSites: setEnabledSites,
          sites: sites,
        }),
      },
      {
        title: "Options",
        icon: "img$setting",
        comp: preact.h(Options, {
          options: options,
        }),
      },
      {
        title: "About",
        icon: "img$info",
        comp: preact.h(About, null),
      },
    ];
    const onClickCancel = () => {
      setShow(false);
      // Restore state
      setEnabledSites(config.enabled_sites);
      setFetchResults(config.fetch_results);
      setOpenBlank(config.open_blank);
    };
    const onClickSave = () => {
      setConfig({
        enabled_sites: enabledSites,
        fetch_results: fetchResults,
        open_blank: openBlank,
      });
      setShow(false);
    };
    return preact.h(
      "div",
      {
        className: `${css$3.popover} ${css$3["layout-" + layout]}`,
        style: {
          display: show ? "block" : "none",
        },
      },
      preact.h(
        "div",
        {
          className: css$3.inner,
        },
        preact.h(
          "div",
          {
            className: css$3.top,
          },
          tabs.map(({ title, icon }, i) =>
            preact.h(
              "button",
              {
                className: tab === i ? css$3.active : null,
                type: "button",
                onClick: () => setTab(i),
              },
              preact.h(Icon, {
                title: title,
                type: icon,
              }),
              " ",
              title
            )
          ),
          preact.h(
            "div",
            {
              className: css$3.link,
            },
            preact.h(
              "a",
              {
                target: "_blank",
                rel: "noreferrer",
                href: "https://github.com/RyanPMcL/IMDb-Piracy-Links",
              },
              GM.info.script.version
            )
          )
        ),
        preact.h(
          "div",
          {
            className: css$3.body,
          },
          tabs.map(({ comp }, i) =>
            preact.h(
              "div",
              {
                style: {
                  display: tab === i ? "block" : "none",
                },
              },
              comp
            )
          )
        ),
        preact.h(
          "div",
          {
            className: css$3.controls,
          },
          preact.h(
            "div",
            null,
            preact.h(
              "button",
              {
                className: "btn primary small",
                onClick: onClickSave,
                type: "button",
              },
              "Save"
            ),
            preact.h(
              "button",
              {
                className: "btn small",
                onClick: onClickCancel,
                type: "button",
              },
              "Cancel"
            )
          )
        )
      )
    );
  };

  function _extends() {
    _extends = Object.assign
      ? Object.assign.bind()
      : function (target) {
          for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];
            for (var key in source) {
              if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
              }
            }
          }
          return target;
        };
    return _extends.apply(this, arguments);
  }

  const replaceFields = (str, { id, title, year }, encode = true) =>
    str
      .replace(
        new RegExp("{{IMDB_TITLE}}", "g"),
        encode ? encodeURIComponent(title) : title
      )
      .replace(new RegExp("{{IMDB_ID}}", "g"), id)
      .replace(new RegExp("{{IMDB_YEAR}}", "g"), year);

  const checkResponse = (resp, site) => {
    // Likely a redirect to login page
    if (
      resp.responseHeaders &&
      resp.responseHeaders.includes("Refresh: 0; url=")
    ) {
      return FETCH_STATE.NO_ACCESS;
    }

    // There should be a responseText
    if (!resp.responseText) {
      return FETCH_STATE.ERROR;
    }

    // Detect CloudFlare anti DDOS page
    if (resp.responseText.includes("Checking your browser before accessing")) {
      return FETCH_STATE.NO_ACCESS;
    }

    // Check site access
    if (site.noAccessMatcher) {
      const matchStrings = Array.isArray(site.noAccessMatcher)
        ? site.noAccessMatcher
        : [site.noAccessMatcher];
      if (
        matchStrings.some((matchString) =>
          resp.responseText.includes(matchString)
        )
      ) {
        return FETCH_STATE.NO_ACCESS;
      }
    }
    // Check results
    if (Array.isArray(site.noResultsMatcher)) {
      // Advanced ways of checking, currently only EL_COUNT is supported
      const [checkType, selector, compType, number] = site.noResultsMatcher;
      const m = resp.responseHeaders.match(/content-type:\s([^\s;]+)/);
      const contentType = m ? m[1] : "text/html";
      let doc;
      try {
        const parser = new DOMParser();
        doc = parser.parseFromString(resp.responseText, contentType);
      } catch (e) {
        console.error("Could not parse document!");
        return FETCH_STATE.ERROR;
      }
      switch (checkType) {
        case "EL_COUNT": {
          let result;
          try {
            result = doc.querySelectorAll(selector);
          } catch (err) {
            console.error(err);
            return FETCH_STATE.ERROR;
          }
          if (compType === "GT") {
            if (result.length > number) {
              return FETCH_STATE.RESULTS_FOUND;
            }
          }
          if (compType === "LT") {
            if (result.length < number) {
              return FETCH_STATE.RESULTS_FOUND;
            }
          }
          break;
        }
      }
      return FETCH_STATE.NO_RESULTS;
    }
    const matchStrings = Array.isArray(site.noResultsMatcher)
      ? site.noResultsMatcher
      : [site.noResultsMatcher];
    if (
      matchStrings.some((matchString) =>
        resp.responseText.includes(matchString)
      )
    ) {
      return FETCH_STATE.NO_RESULTS;
    }
    return FETCH_STATE.RESULTS_FOUND;
  };
  const useResultFetcher = (imdbInfo, site) => {
    const [fetchState, setFetchState] = hooks.useState(null);
    hooks.useEffect(() => {
      let xhr;
      if (site.noResultsMatcher) {
        // Site supports result fetching
        const { url } = site;
        const isPost = Array.isArray(url);
        const opts = {
          timeout: 20000,
          onload: (resp) => setFetchState(checkResponse(resp, site)),
          onerror: (resp) => {
            console.error(
              `Failed to fetch results from URL '${url}': ${resp.statusText}`
            );
            setFetchState(FETCH_STATE.ERROR);
          },
          ontimeout: () => setFetchState(FETCH_STATE.TIMEOUT),
        };
        if (isPost) {
          const [postUrl, fields] = url;
          opts.method = "POST";
          opts.url = postUrl;
          opts.headers = {
            "Content-Type": "application/x-www-form-urlencoded",
          };
          opts.data = Object.keys(fields)
            .map((key) => {
              const val = replaceFields(fields[key], imdbInfo, false);
              return `${key}=${val}`;
            })
            .join("&");
        } else {
          opts.method = "GET";
          opts.url = replaceFields(url, imdbInfo);
        }
        xhr = GM.xmlHttpRequest(opts);
        setFetchState(FETCH_STATE.LOADING);
      }
      return () => {
        if (xhr && xhr.abort) {
          xhr.abort();
        }
      };
    }, [imdbInfo, site]);
    return fetchState;
  };

  var css_248z$2 =
    ".SiteLink_linkWrapper__wGnJ- {\n  display: inline-block;\n  margin-right: 4px;\n}\n\n  .SiteLink_linkWrapper__wGnJ- img {\n    vertical-align: baseline;\n}\n\n  .SiteLink_linkWrapper__wGnJ- a {\n    white-space: pre-line;\n}\n\n  .SiteLink_linkWrapper__wGnJ- a > img {\n      height: 16px;\n      width: 16px;\n      margin-right: 4px;\n}\n\n  .SiteLink_linkWrapper__wGnJ- .SiteLink_resultsIcon__mjHYM {\n    margin-left: 4px;\n}\n";
  var css$2 = {
    linkWrapper: "SiteLink_linkWrapper__wGnJ-",
    resultsIcon: "SiteLink_resultsIcon__mjHYM",
  };
  styleInject(css_248z$2);

  const ResultsIndicator = ({ imdbInfo, site }) => {
    const fetchState = useResultFetcher(imdbInfo, site);
    let iconType;
    let title;
    switch (fetchState) {
      case FETCH_STATE.LOADING:
        iconType = "img$load";
        title = "Loading…";
        break;
      case FETCH_STATE.NO_RESULTS:
        iconType = "img$fail";
        title = "No Results found!";
        break;
      case FETCH_STATE.RESULTS_FOUND:
        iconType = "img$success";
        title = "Results found!";
        break;
      case FETCH_STATE.NO_ACCESS:
        iconType = "img$restriced";
        title = "You have to login to this site!";
        break;
      case FETCH_STATE.TIMEOUT:
        iconType = "img$timeout";
        title = "You have to login to this site!";
        break;
      case FETCH_STATE.ERROR:
        iconType = "img$warn";
        title = "Error fetching results! (See dev console for details)";
        break;
      default:
        return null;
    }
    return preact.h(Icon, {
      className: css$2.resultsIcon,
      title: title,
      type: iconType,
    });
  };

  const usePostLink = (url, openBlank, imdbInfo) => {
    const formEl = hooks.useRef();
    const isPost = Array.isArray(url);
    const href = isPost ? url[0] : replaceFields(url, imdbInfo, false);
    const onClick = (event) => {
      if (isPost && formEl.current) {
        event.preventDefault();
        formEl.current.submit();
      }
    };
    hooks.useEffect(() => {
      if (isPost) {
        const [postUrl, fields] = url;
        const form = document.createElement("form");
        form.action = postUrl;
        form.method = "POST";
        form.style.display = "none";
        form.target = openBlank ? "_blank" : "_self";
        Object.keys(fields).forEach((key) => {
          const input = document.createElement("input");
          input.type = "text";
          input.name = key;
          input.value = replaceFields(fields[key], imdbInfo, false);
          form.appendChild(input);
        });
        document.body.appendChild(form);
        formEl.current = form;
      }
      return () => {
        if (formEl.current) {
          formEl.current.remove();
        }
      };
    });
    return [href, onClick];
  };

  const Sep = () =>
    preact.h(
      preact.Fragment,
      null,
      "\xA0",
      preact.h(
        "span",
        {
          className: "ghost",
        },
        "|"
      )
    );
  const SiteLink = ({ config, imdbInfo, last, site }) => {
    const extraAttrs = config.open_blank
      ? {
          target: "_blank",
          rel: "noreferrer",
        }
      : {};
    const [href, onClick] = usePostLink(site.url, config.open_blank, imdbInfo);
    return preact.h(
      "span",
      {
        className: css$2.linkWrapper,
      },
      preact.h(
        "a",
        _extends(
          {
            className: "ipc-link ipc-link--base",
            href: href,
            onClick: onClick,
          },
          extraAttrs
        ),
        preact.h(SiteIcon, {
          site: site,
        }),
        preact.h("span", null, site.title)
      ),
      config.fetch_results
        ? preact.h(ResultsIndicator, {
            imdbInfo: imdbInfo,
            site: site,
          })
        : null,
      last ? null : preact.h(Sep, null)
    );
  };

  var css_248z$1 =
    ".LinkList_linkList__beWAL {\n  line-height: 1.6rem\n}\n\n.LinkList_h4__OVHW- {\n  margin-top: 0.5rem\n}\n";
  var css$1 = {
    linkList: "LinkList_linkList__beWAL",
    h4: "LinkList_h4__OVHW-",
  };
  styleInject(css_248z$1);

  const LinkList = ({ config, imdbInfo, sites }) => {
    const metaTagType = document
      .querySelector('meta[property="og:type"]')
      .getAttribute("content");

    return Object.entries(CATEGORIES).map(([category, categoryName]) => {
      const catSites = sites.filter(
        (site) =>
          site.category.includes(category) &&
          config.enabled_sites.includes(site.id) &&
          ((category === "movie" && metaTagType === "video.movie") ||
            (category === "tv" && metaTagType === "video.tv_show"))
      );

      if (!catSites.length) {
        return null;
      }

      return preact.h(
        preact.Fragment,
        null,
        preact.h("h4", { className: css$1.h4 }, "Piracy Links"),
        preact.h(
          "div",
          { className: css$1.linkList },
          catSites.map((site, i) =>
            preact.h(SiteLink, {
              config: config,
              imdbInfo: imdbInfo,
              last: i === catSites.length - 1,
              site: site,
            })
          )
        )
      );
    });
  };

  var css_248z =
    ".App_configWrapper__bVP2M {\n  position: absolute;\n  right: 20px;\n  top: 20px;\n}\n\n  .App_configWrapper__bVP2M > button {\n    background: transparent;\n    border: none;\n    cursor: pointer;\n    outline: none;\n    padding: 0;\n}\n\n  .App_configWrapper__bVP2M > button > img {\n      vertical-align: baseline;\n}\n";
  var css = { configWrapper: "App_configWrapper__bVP2M" };
  styleInject(css_248z);

  const restoreConfig = async () =>
    JSON.parse(await GM.getValue(GM_CONFIG_KEY));
  const saveConfig = async (config) =>
    GM.setValue(GM_CONFIG_KEY, JSON.stringify(config));
  const useConfig = () => {
    const [config, setConfig] = hooks.useState();
    hooks.useEffect(() => {
      restoreConfig()
        .then((c) => setConfig(c))
        .catch(() => setConfig(DEFAULT_CONFIG));
    }, []);
    hooks.useEffect(() => {
      if (config) {
        saveConfig(config);
      }
    }, [config]);
    return {
      config,
      setConfig,
    };
  };

  const loadSites = () =>
    new Promise((resolve, reject) =>
      GM.xmlHttpRequest({
        method: "GET",
        url: "https://raw.githubusercontent.com/RyanPMcL/IMDb-Piracy-Links/refs/heads/main/Links.json",
        nocache: true,
        onload({ response, status, statusText }) {
          if (status === 200) {
            try {
              resolve(
                JSON.parse(response).sort((a, b) =>
                  a.title.localeCompare(b.title)
                )
              );
            } catch (e) {
              reject(e);
            }
          } else {
            reject(
              new Error(
                `LTA: Could not load sites (URL=${url}): ${status} ${statusText}`
              )
            );
          }
        },
        onerror({ status, statusText }) {
          reject(
            new Error(
              `LTA: Could not load sites (URL=${url}): ${status} ${statusText}`
            )
          );
        },
      })
    );
  const useSites = () => {
    const [sites, setSites] = hooks.useState([]);
    hooks.useEffect(() => {
      loadSites()
        .then((s) => setSites(s))
        .catch((err) => setSites(err.message));
    }, []);
    return sites;
  };

  const App = ({ imdbInfo }) => {
    const { config, setConfig } = useConfig();
    const sites = useSites();
    const [showConfig, setShowConfig] = hooks.useState(false);
    hooks.useEffect(() => {
      if (config && config.first_run) {
        setShowConfig(true);
        setConfig((prev) => ({
          ...prev,
          first_run: false,
        }));
      }
    }, [config]);
    if (typeof sites === "string") {
      return sites; // Display error message
    }

    if (!config || !sites.length) {
      return null;
    }
    return preact.h(
      preact.Fragment,
      null,
      preact.h(
        "div",
        {
          className: css.configWrapper,
        },
        preact.h(
          "button",
          {
            onClick: () => setShowConfig((cur) => !cur),
            title: "Configure",
            type: "button",
          },
          preact.h(Icon, {
            type: "img$setting",
          })
        ),
        preact.h(Config, {
          config: config,
          layout: imdbInfo.layout,
          setConfig: setConfig,
          setShow: setShowConfig,
          sites: sites,
          show: showConfig,
        })
      ),
      preact.h(LinkList, {
        config: config,
        imdbInfo: imdbInfo,
        sites: sites,
      })
    );
  };

  const divId = "__LTA__";
  const detectURL = (mUrl) => {
    return ["title", "main > * > section > div"];
  };
  const parseImdbInfo = () => {
    // TODO: extract type (TV show, movie, ...)

    // Parse IMDb number and layout
    const mUrl = /^\/title\/tt([0-9]{7,8})\/([a-z]*)/.exec(
      window.location.pathname
    );
    const [titleSelector, containerSelector] = detectURL(mUrl);
    const info = {
      id: mUrl[1]
    };
    info.title = document.querySelector(titleSelector).innerText.trim();
    const mTitle = /^(.+?)(\s+\(.*\d{4}.*\))?(\s+-\s+IMDb)?$/.exec(info.title);
    if (mTitle) {
      info.title = mTitle[1].trim();
      if (mTitle[2]) {
        const yearMatch = /\((\d{4})–?\)/.exec(mTitle[2]);
        if (yearMatch) {
          info.year = parseInt(yearMatch[1].trim(), 10);
        }
      }
    }
    return [info, containerSelector];
  };
  const [imdbInfo, containerSelector] = parseImdbInfo();
  const injectAndStart = () => {
    let injectionEl = document.querySelector(containerSelector);
    if (!injectionEl) {
      throw new Error("LTA: Could not find target container!");
    }
    const container = document.createElement("div");
    container.id = divId;
    container.style.position = "relative";
    container.className =
      "ipc-page-content-container ipc-page-content-container--center";
    container.style.backgroundColor = "white";
    container.style.padding = "0 var(--ipt-pageMargin)";
    container.style.minHeight = "50px";
    injectionEl.prepend(container);
    preact.render(
      preact.h(App, {
        imdbInfo: imdbInfo,
      }),
      container
    );
  };
  const containerWatchdog = () => {
    const container = document.querySelector(`#${divId}`);
    if (container === null) {
      injectAndStart();
    }
    window.setTimeout(containerWatchdog, 1000);
  };
  window.setTimeout(containerWatchdog, 500);
})(preact, preactHooks);