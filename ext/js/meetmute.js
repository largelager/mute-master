const MUTE_BUTTON = '[role="button"][aria-label][data-is-muted]'

const waitUntilElementExists = (DOMSelector, MAX_TIME = 5000) => {
  let timeout = 0

  const waitForContainerElement = (resolve, reject) => {
    const container = document.querySelector(DOMSelector)
    timeout += 100

    if (timeout >= MAX_TIME) reject('Element not found')

    if (!container || container.length === 0) {
      setTimeout(waitForContainerElement.bind(this, resolve, reject), 100)
    } else {
      resolve(container)
    }
  }

  return new Promise((resolve, reject) => {
    waitForContainerElement(resolve, reject);
  })
}

var waitingForMuteButton = false

function waitForMuteButton() {
  if (waitingForMuteButton) {
    return
  }
  waitingForMuteButton = true
  waitUntilElementExists(MUTE_BUTTON)
    .then((el) => {
      waitingForMuteButton = false
      updateMuted()
      watchIsMuted(el)
    })
    .catch((error) => {
      // Change from chrome.extension to chrome.runtime
      chrome.runtime.sendMessage({ message: 'disconnected' })
    })
}

var muted = false

function isMuted() {
  let dataIsMuted = document.querySelector(MUTE_BUTTON)
      .getAttribute('data-is-muted')
  return dataIsMuted == 'true'
}

function updateMuted(newValue) {
  if (!isExtensionContextValid()) {
    console.log('Extension context invalidated, reloading page...');
    window.location.reload();
    return;
  }

  try {
    muted = newValue || isMuted()
    chrome.runtime.sendMessage({ message: muted ? 'muted' : 'unmuted' })
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      console.log('Extension context invalidated, reloading page...');
      window.location.reload();
    } else {
      console.error('Error in updateMuted:', error);
    }
  }
}

var isMutedObserver

function watchIsMuted(el) {
  if (isMutedObserver) {
    isMutedObserver.disconnect()
  }
  isMutedObserver = new MutationObserver((mutations) => {
    let newValue = mutations[0].target.getAttribute('data-is-muted') == 'true'

    if (newValue != muted) {
      updateMuted(newValue)
    }
  })
  isMutedObserver.observe(el, {
    attributes: true,
    attributeFilter: ['data-is-muted']
  })
}

function watchBodyClass() {
  const bodyClassObserver = new MutationObserver((mutations) => {
    let newClass = mutations[0].target.getAttribute('class')
    if (mutations[0].oldValue != newClass) {
      waitForMuteButton()
    }
  })
  bodyClassObserver.observe(document.querySelector('body'), {
    attributes: true,
    attributeFilter: ['class'],
    attributeOldValue: true
  })
}

watchBodyClass()

window.onbeforeunload = (event) => {
  if (isExtensionContextValid()) {
    try {
      chrome.runtime.sendMessage({ message: 'disconnected' })
    } catch (error) {
      console.log('Error sending disconnect message:', error);
    }
  }
}

// Add this function to check if the extension context is still valid
function isExtensionContextValid() {
  try {
    // Try to access chrome.runtime
    return !!chrome.runtime.getURL('');
  } catch (e) {
    return false;
  }
}

// Modify the message listener to check for valid context
chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    // Check if extension context is still valid
    if (!isExtensionContextValid()) {
      console.log('Extension context invalidated, reloading page...');
      window.location.reload();
      return;
    }

    try {
      muted = isMuted()
      if (request && request.command && request.command === 'toggle_mute') {
        muted = !muted
        sendKeyboardCommand()
      } else if (request && request.command && request.command === 'mute') {
        if (!muted) {
          muted = !muted
          sendKeyboardCommand()
        }
      } else if (request && request.command && request.command === 'unmute') {
        if (muted) {
          muted = !muted
          sendKeyboardCommand()
        }
      }

      sendResponse({ message: muted ? 'muted' : 'unmuted' });
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.log('Extension context invalidated, reloading page...');
        window.location.reload();
      } else {
        console.error('Error in message listener:', error);
      }
    }
  }
)

const keydownEvent = new KeyboardEvent('keydown', {
  "key": "d",
  "code": "KeyD",
  "metaKey": true,
  "charCode": 100,
  "keyCode": 100,
  "which": 100
})

function sendKeyboardCommand() {
  document.dispatchEvent(keydownEvent)
}

// function setIcon(status) {
//   let iconType = ''
//   if (status === 'muted' || status === 'unmuted') {
//     iconType = '_' + status
//   }
//   let title = status?.charAt(0).toUpperCase() + status?.substr(1)
  
//   // Use chrome.runtime.getURL to get the full path to the icons
//   chrome.action.setIcon({
//     path: {
//       "32": chrome.runtime.getURL(`icons/icon32${iconType}.png`),
//       "48": chrome.runtime.getURL(`icons/icon48${iconType}.png`),
//       "128": chrome.runtime.getURL(`icons/icon128${iconType}.png`)
//     }
//   })
  
//   chrome.action.setTitle({
//     title: title || 'Disconnected'
//   })
// }