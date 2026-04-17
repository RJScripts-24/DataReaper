class DataReaperError(Exception):
    """Base application error."""


class ResourceNotFoundError(DataReaperError):
    """Raised when a resource cannot be located."""


class InvalidSeedError(DataReaperError):
    """Raised when a seed value is invalid."""
