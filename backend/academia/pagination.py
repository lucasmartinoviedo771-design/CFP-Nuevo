import os
from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    page_size = int(os.getenv("DRF_PAGE_SIZE", "25"))
    page_size_query_param = "page_size"
    max_page_size = int(os.getenv("DRF_MAX_PAGE_SIZE", "200"))

