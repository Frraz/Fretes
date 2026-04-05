from django.urls import path
from . import views

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("api/kpis/", views.api_kpis),
    path("api/resumo/", views.api_resumo),
    path("api/motorista/<int:motorista_id>/", views.api_motorista_detalhe),
    path("api/colheita/", views.api_colheita),
    path("api/romaneios/", views.api_romaneios),
    path("api/abastecimentos/", views.api_abastecimentos),
    path("api/adiantamentos/", views.api_adiantamentos),
    path("api/filtros/", views.api_filtros),
    path("api/sync/", views.api_sync),
]