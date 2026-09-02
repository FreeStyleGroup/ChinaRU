package com.chinaru.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

// Модель данных товара (в будущем она будет маппиться из JSON от Битрикса)
data class Product(
    val id: Int,
    val name: String,
    val price: String,
    val isFreeShipping: Boolean
)

// Состояния нашего экрана
sealed class HomeUiState {
    object Loading : HomeUiState()
    data class Success(val products: List<Product>) : HomeUiState()
    data class Error(val message: String) : HomeUiState()
}

class HomeViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadProducts()
    }

    fun loadProducts() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            try {
                // Имитируем запрос к API Битрикса (задержка 1.5 секунды)
                delay(1500)
                
                // Генерируем мок-данные
                val mockProducts = List(10) { index ->
                    Product(
                        id = index,
                        name = "Крутой товар из Китая, модель $index",
                        price = "₽ ${(1000..5000).random()}",
                        isFreeShipping = index % 2 == 0
                    )
                }
                _uiState.value = HomeUiState.Success(mockProducts)
            } catch (e: Exception) {
                _uiState.value = HomeUiState.Error("Ошибка загрузки. Проверьте интернет.")
            }
        }
    }
}