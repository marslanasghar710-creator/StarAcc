import re

from fastapi import HTTPException

VAR_PATTERN = re.compile(r"{{\s*([a-zA-Z0-9_]+)\s*}}")


class EmailRenderService:
    def render(self, template: str, variables: dict[str, object]) -> str:
        missing: set[str] = set()

        def replacer(match):
            key = match.group(1)
            if key not in variables:
                missing.add(key)
                return match.group(0)
            value = variables[key]
            return "" if value is None else str(value)

        rendered = VAR_PATTERN.sub(replacer, template)
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing merge variables: {', '.join(sorted(missing))}")
        return rendered
