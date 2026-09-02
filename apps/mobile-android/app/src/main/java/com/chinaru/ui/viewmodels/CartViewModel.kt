package com.chinaru.ui.viewmodels

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class CartItem(
    val id: Int,
    val name: String,
    val price: Int, // Используем Int для удобного подсчета суммы
    val quantity: Int
)

class CartViewModel : ViewModel() {
    private val _cartItems = MutableStateFlow<List<CartItem>>(emptyList())
    val cartItems: StateFlow<List<CartItem>> = _cartItems.asStateFlow()

    init {
        // Заполняем корзину тестовыми данными
        _cartItems.value = listOf(
            CartItem(id = 1, name = "Беспроводные наушники Pro", price = 1500, quantity = 1),
            CartItem(id = 2, name = "Умные часы Series 8", price = 3200, quantity = 2),
            CartItem(id = 3, name = "Силиконовый чехол", price = 350, quantity = 1)
        )
    }

    fun incrementQuantity(itemId: Int) {
        _cartItems.update { items -> items.map { if (it.id == itemId) it.copy(quantity = it.quantity + 1) else it } }
    }

    fun decrementQuantity(itemId: Int) {
        _cartItems.update { items -> items.map { if (it.id == itemId && it.quantity > 1) it.copy(quantity = it.quantity - 1) else it } }
    }

    fun removeItem(itemId: Int) {
        _cartItems.update { items -> items.filter { it.id != itemId } }
    }
}