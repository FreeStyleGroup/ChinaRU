package com.chinaru.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

// Детальная модель товара
data class ProductDetail(
    val id: Int,
    val name: String,
    val price: String,
    val description: String,
    val rating: Double,
    val reviewsCount: Int,
    val deliveryEstimate: String
)

sealed class ProductUiState {
    object Loading : ProductUiState()
    data class Success(val product: ProductDetail) : ProductUiState()
    data class Error(val message: String) : ProductUiState()
}

class ProductViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<ProductUiState>(ProductUiState.Loading)
    val uiState: StateFlow<ProductUiState> = _uiState.asStateFlow()

    fun loadProduct(productId: Int) {
        viewModelScope.launch {
            _uiState.value = ProductUiState.Loading
            try {
                delay(1200) // Имитация запроса к API
                val mockProduct = ProductDetail(
                    id = productId,
                    name = "Оригинальный товар из Китая, модель $productId с расширенной комплектацией",
                    price = "₽ ${(1500..15000).random()}",
                    description = "Здесь будет подробное описание товара #$productId, загруженное через API вашего маркетплейса на Битрикс. Мы добавим сюда характеристики, таблицы размеров и дополнительные фотографии от продавца.",
                    rating = String.format("%.1f", (35..50).random() / 10.0).replace(",", ".").toDouble(),
                    reviewsCount = (10..500).random(),
                    deliveryEstimate = "15-25 дней"
                )
                _uiState.value = ProductUiState.Success(mockProduct)
            } catch (e: Exception) {
                _uiState.value = ProductUiState.Error("Не удалось загрузить информацию о товаре.")
            }
        }
    }
}