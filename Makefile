HOOKS = pre-commit commit-msg pre-push
HOOKS_DIR = .git/hooks
SRC_DIR = .githooks

install-hooks:
	@echo "Installing Git hooks..."
	@if [ ! -d ".git" ]; then \
		echo "Not a git repository"; \
		exit 1; \
	fi
	@for hook in $(HOOKS); do \
		cp -f $(SRC_DIR)/$$hook $(HOOKS_DIR)/$$hook; \
		chmod +x $(HOOKS_DIR)/$$hook; \
	done
	@echo "Hooks installed successfully."

clean-hooks:
	rm -f .git/hooks/pre-commit .git/hooks/commit-msg .git/hooks/pre-push