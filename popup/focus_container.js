function onError(e) {
  console.error(e);
}

const MODE_SHOW_ONLY = Symbol('MODE_SHOW_ONLY');
const MODE_SHOW_ALL = Symbol('MODE_SHOW_ALL');
const MODE_SHOW_ALL_EXCEPT = Symbol('MODE_SHOW_ALL_EXCEPT');
const MODE_TOGGLE = Symbol('MODE_TOGGLE');
const TIMEOUT_MS = 200;

const $identityList = document.querySelector('#context-list');
const $tmplIdentityItem = document.querySelector('#tmpl-context-item');
let clickTimeoutId = null;

const setTabsVisibility = ({ cookieStoreId, mode = MODE_TOGGLE } = {}) => {
  browser.tabs.query({ })
    .then((tabs) => {
      const tabIdsToShow = [];
      const tabIdsToHide = [];
      const allTabIds = [];

      for (const tab of tabs) {
        allTabIds.push(tab.id);

        if (mode === MODE_SHOW_ALL) {
          tabIdsToShow.push(tab.id);
        } else if (mode === MODE_TOGGLE) {
          if (tab.cookieStoreId === cookieStoreId) {
            if (tab.hidden) {
              tabIdsToShow.push(tab.id);
            } else {
              tabIdsToHide.push(tab.id);
            }
          }
        } else if (mode === MODE_SHOW_ALL_EXCEPT) {
          if(tab.cookieStoreId === cookieStoreId) {
            tabIdsToHide.push(tab.id);
          } else {
            tabIdsToShow.push(tab.id);
          }
        } else if (mode === MODE_SHOW_ONLY) {
          if(tab.cookieStoreId === cookieStoreId) {
            tabIdsToShow.push(tab.id);
          } else {
            tabIdsToHide.push(tab.id);
          }
        } else {
          throw new Error(`Unknown mode: ${mode}`);
        }
      }

      if(tabIdsToShow.length === 0 && tabIdsToHide.length === allTabIds.length) {
        browser.tabs.show(allTabIds);
      } else {
        browser.tabs.show(tabIdsToShow);
        browser.tabs.hide(tabIdsToHide);
      }
    });
}

browser.tabs.onActivated.addListener((event) => {
  console.log(222, event)
});

Promise.all([
  browser.contextualIdentities.query({}),
  browser.tabs.query({})
  ])
  .then(([indentities, tabs]) => {
    const defaultIdentity = {
      icon: 'tabs',
      name: 'Default',
      cookieStoreId: 'firefox-default',
    };

    indentities = [defaultIdentity, ...indentities];

    for (const identity of indentities) {
      identity.tabs = tabs.filter(t => t.cookieStoreId === identity.cookieStoreId);
    }

    return indentities;
  })
  .then((indentities) => {
    console.log(indentities[1])
    for (const identity of indentities) {
      if(identity.tabs.length === 0) continue;

      const clone = document.importNode($tmplIdentityItem.content, true);
      const $identityItem = clone.querySelector('li');
      const $img = $identityItem.querySelector('img');

      $icon = document.getElementById(identity.icon).cloneNode(true);
      $icon.id = '';
      $icon.style.fill = identity.colorCode;
      $icon.classList.remove('hidden');
      $identityItem.title = identity.name;
      $identityItem.style = $identityItem.style || {};
      $identityItem.appendChild($icon)
      $identityList.appendChild($identityItem);

      $identityItem.addEventListener('click', function({ cookieStoreId }, event) {
        if(clickTimeoutId) {
          clickTimeoutId = clearTimeout(clickTimeoutId);
          setTabsVisibility({ mode: MODE_SHOW_ONLY, cookieStoreId, });
        } else {
          clickTimeoutId = setTimeout(() => {
            clickTimeoutId = clearTimeout(clickTimeoutId);
            setTabsVisibility({ mode: MODE_TOGGLE, cookieStoreId, });
          }, TIMEOUT_MS)
        }
      }.bind(null, identity));
    }
  })
  .catch(onError);

document.querySelector('#show-all')
  .addEventListener('click', () => {
    setTabsVisibility({ mode: MODE_SHOW_ALL, });
  });