/**
 * UIBinder - Manages UI element references and bindings
 *
 * Benefits:
 * - Caches DOM elements (no repeated queries)
 * - Automatic input validation
 * - Type-safe element access
 * - Easy to mock for testing
 */

export default class UIBinder {
    constructor(bindings) {
        this.bindings = bindings;
        this.elements = new Map();
        this.initialized = false;
    }

    /**
     * Initialize and cache all elements
     */
    initialize() {
        if (this.initialized) {
            console.warn('UIBinder already initialized');
            return;
        }

        // Cache buttons
        if (this.bindings.buttons) {
            Object.entries(this.bindings.buttons).forEach(([name, elementId]) => {
                const element = document.getElementById(elementId);
                if (element) {
                    this.elements.set(`button:${name}`, element);
                } else {
                    console.warn(`UIBinder: Button element not found: ${elementId}`);
                }
            });
        }

        // Cache inputs
        if (this.bindings.inputs) {
            Object.entries(this.bindings.inputs).forEach(([name, config]) => {
                const elementId = typeof config === 'string' ? config : config.elementId;
                const element = document.getElementById(elementId);
                if (element) {
                    this.elements.set(`input:${name}`, element);
                } else {
                    console.warn(`UIBinder: Input element not found: ${elementId}`);
                }
            });
        }

        // Cache containers
        if (this.bindings.containers) {
            Object.entries(this.bindings.containers).forEach(([name, elementId]) => {
                const element = document.getElementById(elementId);
                if (element) {
                    this.elements.set(`container:${name}`, element);
                } else {
                    console.warn(`UIBinder: Container element not found: ${elementId}`);
                }
            });
        }

        // Cache pages
        if (this.bindings.pages) {
            Object.entries(this.bindings.pages).forEach(([name, elementId]) => {
                const element = document.getElementById(elementId);
                if (element) {
                    this.elements.set(`page:${name}`, element);
                } else {
                    console.warn(`UIBinder: Page element not found: ${elementId}`);
                }
            });
        }

        this.initialized = true;
        console.log(`UIBinder initialized with ${this.elements.size} cached elements`);
    }

    /**
     * Get a cached button element
     */
    getButton(name) {
        return this.elements.get(`button:${name}`);
    }

    /**
     * Get a cached input element
     */
    getInput(name) {
        return this.elements.get(`input:${name}`);
    }

    /**
     * Get a cached container element
     */
    getContainer(name) {
        return this.elements.get(`container:${name}`);
    }

    /**
     * Get a cached page element
     */
    getPage(name) {
        return this.elements.get(`page:${name}`);
    }

    /**
     * Get any cached element by key
     */
    get(key) {
        return this.elements.get(key);
    }

    /**
     * Bind an input with automatic validation
     * @param {string} name - Input name from bindings
     * @param {Function} onChange - Callback when value changes
     * @param {Object} options - Additional options
     */
    bindInput(name, onChange, options = {}) {
        const config = this.bindings.inputs?.[name];
        const element = this.getInput(name);

        if (!element || !config) {
            console.warn(`Cannot bind input: ${name} not found`);
            return;
        }

        const inputConfig = typeof config === 'string' ? {} : config;
        const events = inputConfig.events || ['change'];

        const handler = () => {
            let value = element.value;

            // Validate if validator exists
            if (inputConfig.validator && !inputConfig.validator(value)) {
                element.classList.add('invalid');
                if (options.onInvalid) {
                    options.onInvalid(value);
                }
                return;
            }

            element.classList.remove('invalid');

            // Sanitize if sanitizer exists
            if (inputConfig.sanitizer) {
                value = inputConfig.sanitizer(value);
            }

            // Call onChange with sanitized/validated value
            onChange(value);
        };

        // Bind all configured events
        events.forEach(event => {
            element.addEventListener(event, handler);
        });

        // Handle Enter key for text inputs
        if (inputConfig.type === 'text' || inputConfig.type === 'number') {
            element.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    element.blur();
                    handler();
                }
            });
        }

        return handler;
    }

    /**
     * Bind a button click handler
     * @param {string} name - Button name from bindings
     * @param {Function} onClick - Click handler
     */
    bindButton(name, onClick) {
        const element = this.getButton(name);
        if (!element) {
            console.warn(`Cannot bind button: ${name} not found`);
            return;
        }

        element.addEventListener('click', onClick);
        return onClick;
    }

    /**
     * Set text content of an element
     * @param {string} type - Element type (button, input, container)
     * @param {string} name - Element name
     * @param {string} text - Text to set
     */
    setText(type, name, text) {
        const element = this.elements.get(`${type}:${name}`);
        if (element) {
            element.textContent = text;
        }
    }

    /**
     * Get value of an input
     * @param {string} name - Input name
     */
    getValue(name) {
        const element = this.getInput(name);
        return element ? element.value : null;
    }

    /**
     * Set value of an input
     * @param {string} name - Input name
     * @param {any} value - Value to set
     */
    setValue(name, value) {
        const element = this.getInput(name);
        if (element) {
            element.value = value;
        }
    }

    /**
     * Show/hide an element
     * @param {string} type - Element type
     * @param {string} name - Element name
     * @param {boolean} show - Whether to show or hide
     */
    setVisible(type, name, show) {
        const element = this.elements.get(`${type}:${name}`);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Enable/disable an element
     * @param {string} type - Element type
     * @param {string} name - Element name
     * @param {boolean} enabled - Whether to enable or disable
     */
    setEnabled(type, name, enabled) {
        const element = this.elements.get(`${type}:${name}`);
        if (element) {
            element.disabled = !enabled;
        }
    }

    /**
     * Clear all cached elements
     */
    clear() {
        this.elements.clear();
        this.initialized = false;
    }

    /**
     * Get all cached elements
     */
    getAllElements() {
        return Array.from(this.elements.entries());
    }

    /**
     * Check if an element exists in cache
     */
    has(type, name) {
        return this.elements.has(`${type}:${name}`);
    }
}
