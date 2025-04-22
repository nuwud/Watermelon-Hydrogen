

# **🍉 WatermelonOS Dev Methodology**

## **🧠 Investigation-First Engineering**

This project embraces an *investigation-first* approach to problem-solving. We don’t guess and patch — we **investigate, validate, and then surgically implement**.

### **✅ Core Principles**

| Step | Description |
| ----- | ----- |
| 🔍 **Investigate First** | Use Copilot Chat and `console.warn()` to trace logic *before* changing code. |
| 🔁 **Run it Backwards** | When something breaks, trace from the symptom (e.g., click handler) back to its origin (e.g., mesh index/assignment). |
| 🧪 **Test Before Patch** | Create Copilot prompts that ask "Why is this breaking?" before asking "How do I fix it?" |
| 🛠 **Surgical Commits** | Apply only *one focused patch* at a time — especially around animation and state logic. |
| 🧼 **Keep `main.js` Sacred** | All visual modules (carousel, submenu, cart, etc.) should plug in cleanly. Avoid global state outside of `main.js` lifecycle control. |
| 🧩 **Isolate with Async** | Favor `async/await` \+ Promises for transitions (submenu switching, asset loads) to keep UI fluid and predictable. |
| 🪓 **Destroy Responsibly** | Every `create()` should have a `dispose()` — tracked, cleaned, and accounted for. |

---

### **📘 WatermelonOS Debug Rituals**

1. **Symptom observed?**  
    Add a `console.warn('[Watermelon]')` marker at the point of error. Use Copilot to trace what touched it.

2. **State stuck?**  
    Verify transition flags like `isTransitioning` or `submenuTransitioning` aren't stale or never reset.

3. **Geometry looks wrong?**  
    Confirm `.geometry.center()` and `.userData.originalScale` are applied after creation but before animation.

**App lockups or double-clicks?**  
 Use async transition chains like:

 await closeSubmenuAsync();  
await spawnSubmenuAsync(...);

4.   
5. **Refactor needed?**  
    Only if the root logic is *repeatedly* failing. Otherwise, patch lightly and validate stability before major rewrites.

---

### **🛠 Example Debug Prompt for Copilot Chat**

🔍 Context:  
Submenu click opens stretched label and wrong content.  
Using Carousel3DSubmenu.js with GLTF preview meshes and dynamic text.

❓ I want to know:  
\- Is the stretched text due to originalScale being set too early?  
\- Is the submenu pointer stale or reused across clicks?  
\- Are submenu items assigning userData.index reliably?

Files: main.js, Carousel3DSubmenu.js, Carousel3DPro.js

Final Goal: Prevent submenu misfires, scaling errors, and lockups — without touching existing dispose logic.

---

### **📈 Results of This Style**

* Submenu transitions are now robust and non-blocking

* Memory management is tight across carousel and submenu lifecycles

* The codebase is easier to reason about and scale

* Engineers can contribute without fear of side effects

---

Let me know if you'd like this scaffolded into a `DEVELOPER.md` file (or want it added to the README as a Developer Workflow section). Ready when you are to tackle the **remaining submenu issues** (center stretching or icon ghosting).

