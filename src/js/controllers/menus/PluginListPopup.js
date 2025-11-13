/**
 * PluginListPopup - Read-only view of active plugins for clients in-game
 * Similar to game log popup but displays the current plugin list
 */
export default class PluginListPopup {
    constructor(pluginManager) {
        this.pluginManager = pluginManager;
        this.popup = document.getElementById('pluginListPopup');
        this.container = document.getElementById('pluginListContainer');
        this.closeButton = document.getElementById('closePluginListButton');
        this.openButton = document.getElementById('openPluginListButton');

        this.isVisible = false;
        this.initialize();
    }

    initialize() {
        // Close button
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.hide());
        }

        // Open button
        if (this.openButton) {
            this.openButton.addEventListener('click', () => this.toggle());
        }

        // Close on clicking outside
        if (this.popup) {
            this.popup.addEventListener('click', (event) => {
                if (event.target === this.popup) {
                    this.hide();
                }
            });
        }
    }

    show() {
        if (this.popup) {
            this.popup.style.display = 'flex';
            this.isVisible = true;
            this.refreshPluginList();
        }
    }

    hide() {
        if (this.popup) {
            this.popup.style.display = 'none';
            this.isVisible = false;
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    refreshPluginList() {
        if (!this.container) return;

        this.container.innerHTML = '';

        const plugins = this.pluginManager.getAllPlugins().filter(p => p.enabled);

        if (plugins.length === 0) {
            this.container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 16px;">No plugins enabled.</p>';
            return;
        }

        plugins.forEach(plugin => {
            const row = this._createPluginRow(plugin);
            this.container.appendChild(row);
        });
    }

    _createPluginRow(plugin) {
        const row = document.createElement('div');
        row.style.padding = '12px';
        row.style.borderBottom = '1px solid var(--border-light, #eee)';
        row.style.transition = 'background-color 0.2s ease';

        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = 'var(--background-hover, rgba(0, 0, 0, 0.02))';
        });

        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = '';
        });

        // Name with badge
        const nameContainer = document.createElement('div');
        nameContainer.style.display = 'flex';
        nameContainer.style.alignItems = 'center';
        nameContainer.style.gap = '8px';
        nameContainer.style.marginBottom = '4px';

        const nameEl = document.createElement('div');
        nameEl.style.fontWeight = '500';
        nameEl.style.fontSize = '1em';
        nameEl.textContent = plugin.name;
        nameContainer.appendChild(nameEl);

        if (plugin.isDefault) {
            const badge = document.createElement('span');
            badge.className = 'plugin-badge';
            badge.textContent = 'CORE';
            badge.style.background = 'var(--primary-color)';
            badge.style.color = 'white';
            badge.style.fontSize = '0.65em';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '3px';
            badge.style.fontWeight = 'bold';
            badge.style.letterSpacing = '0.5px';
            nameContainer.appendChild(badge);
        }

        row.appendChild(nameContainer);

        // Description
        const descEl = document.createElement('div');
        descEl.style.fontSize = '0.85em';
        descEl.style.color = 'var(--text-secondary, #666)';
        descEl.style.marginBottom = '6px';
        descEl.textContent = plugin.description || 'No description available';
        row.appendChild(descEl);

        // Tags
        if (plugin.tags && plugin.tags.length > 0) {
            const tagsContainer = document.createElement('div');
            tagsContainer.style.display = 'flex';
            tagsContainer.style.gap = '6px';
            tagsContainer.style.flexWrap = 'wrap';

            plugin.tags.forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.style.display = 'inline-block';
                tagEl.style.fontSize = '0.7em';
                tagEl.style.padding = '2px 8px';
                tagEl.style.background = 'var(--background-box, #f0f0f0)';
                tagEl.style.border = '1px solid var(--border-light, #e0e0e0)';
                tagEl.style.borderRadius = '12px';
                tagEl.style.color = 'var(--text-secondary, #666)';
                tagEl.style.fontWeight = '500';
                tagEl.textContent = tag;
                tagsContainer.appendChild(tagEl);
            });

            row.appendChild(tagsContainer);
        }

        return row;
    }

    /**
     * Show the button (for clients in-game)
     */
    showButton() {
        if (this.openButton) {
            this.openButton.style.display = 'block';
        }
    }

    /**
     * Hide the button (for hosts or when not in game)
     */
    hideButton() {
        if (this.openButton) {
            this.openButton.style.display = 'none';
        }
    }
}
