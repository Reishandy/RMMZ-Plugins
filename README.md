# Reishandy's RMMZ Plugin Collection

A compilation of RPG Maker MZ plugins created for my own project.

## 📋 Plugin List

1. [Reishandy_Toast.js](#1-reishandy_toastjs)
2. [Reishandy_TextInput.js](#2-reishandy_textinputjs)
3. [Reishandy_CompactMenu.js](#3-reishandy_compactmenujs)

---

### 1. Reishandy_Toast.js

**Description:** A simple toast notification system for RPG Maker MZ.

**Parameters:**

- **MaxWidth:** Percentage of the screen width for toast notifications.
- **MaxToasts:** Maximum number of toasts that can be displayed at once.
- **DisplayTime:** How long toasts stay visible (in frames, 60 frames = 1 second).
- **SlideSpeed:** Speed of toast sliding animation (1-16).
- **ToastPosition:** Position of the toasts on the screen (Top or Bottom).

**Commands:**

- **ShowToast:** Shows a toast notification with specified text.

**Usage:**

To show a toast notification, use the following plugin command in an event:

```
Plugin Command -> Reishandy_Toast : ShowToast
- Text: Your message here
```

To show a toast from another plugin, use:

```javascript
PluginManager.callCommand(this, "Reishandy_Toast", "ShowToast", {
    text: "Your message here"
});
```

Or use the global function:

```javascript
$gameSystem.showToast("Your message here");
```

---

### 2. Reishandy_TextInput.js

**Description:** A simple multi-line text input system for RPG Maker MZ.

**Parameters:**

- **InputWidth:** Percentage of the screen width for the text input box.
- **InputHeight:** Percentage of the screen height for the text input box.

**Commands:**

- **OpenTextInput:** Opens a text input box and stores the result in a variable.
- **SetTextVariable:** Sets the value of a game variable to a specific text.

**Usage:**

To open a text input box from an event, use the following plugin command:

```
Plugin Command -> Reishandy_TextInput : OpenTextInput
- Variable ID: 1
- Label: Enter your message:
- Max Lines: 5
```

To set a variable to a specific text, use:

```
Plugin Command -> Reishandy_TextInput : SetTextVariable
- Variable ID: 1
- Text: Your text
```

---

### 3. Reishandy_CompactMenu.js

**Description:** Customizes menu layout with a compact design.

**Parameters:**

- **windowWidth:** Width of the menu windows as a percentage of the screen width.

**Usage:**

This plugin automatically modifies the main menu layout to remove the actor status window and make the command and gold windows more compact. No additional setup is required.

---

## 📃 Terms of Use

- Free for commercial use
- Free for non-commercial use
- Credit appreciated but not required

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

Created by [Reishandy](https://github.com/Reishandy)
