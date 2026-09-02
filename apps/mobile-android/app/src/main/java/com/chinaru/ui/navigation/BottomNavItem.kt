package com.chinaru.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.ui.graphics.vector.ImageVector

sealed class BottomNavItem(val route: String, val title: String, val icon: ImageVector) {
    object Home : BottomNavItem("home", "Главная", Icons.Default.Home)
    object Catalog : BottomNavItem("catalog", "Каталог", Icons.Default.List)
    object Cart : BottomNavItem("cart", "Корзина", Icons.Default.ShoppingCart)
    object Profile : BottomNavItem("profile", "Профиль", Icons.Default.Person)
}