# Thin re-export: import sub-modules to register their endpoints on the shared router,
# then expose `router` so that `from .api.routes import router` keeps working.

from .storyboard.route_helpers import router  # noqa: F401 — shared APIRouter instance

# Importing these modules registers their @router endpoints on the shared router above.
from .storyboard import project_routes  # noqa: F401
from .storyboard import project_crud_routes  # noqa: F401
from .storyboard import media_routes  # noqa: F401
