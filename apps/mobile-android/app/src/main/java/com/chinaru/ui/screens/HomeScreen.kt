package com.chinaru.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chinaru.ui.theme.*
import com.chinaru.ui.viewmodels.HomeUiState
import com.chinaru.ui.viewmodels.HomeViewModel
import com.chinaru.ui.viewmodels.Product

@Composable
fun HomeScreen(
    onProductClick: (Int) -> Unit = {},
    viewModel: HomeViewModel = viewModel()
) {
    // Подписываемся на изменения состояния
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = { HomeTopBar() },
        containerColor = BackgroundGray
    ) { paddingValues ->
        when (val state = uiState) {
            is HomeUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = PrimaryRed)
                }
            }
            is HomeUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = state.message, color = TextMain)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { viewModel.loadProducts() },
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryRed)
                        ) {
                            Text("Повторить", color = SurfaceWhite)
                        }
                    }
                }
            }
            is HomeUiState.Success -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                ) {
                    // Секция категорий (занимает всю ширину)
                    item(span = { GridItemSpan(2) }) {
                        CategorySection()
                    }

                    // Заголовок "Горящие товары" (занимает всю ширину)
                    item(span = { GridItemSpan(2) }) {
                        Text(
                            text = "Горящие товары",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextMain,
                            modifier = Modifier.padding(vertical = 8.dp, horizontal = 4.dp)
                        )
                    }

                    /* Карточки строятся по списку из состояния, а не по
                       счётчику: раньше в ProductCard уходил индекс, хотя
                       она ждёт товар, и экран не собирался вовсе. */
                    items(
                        items = state.products,
                        key = { product -> product.id }
                    ) { product ->
                        ProductCard(product, onProductClick)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeTopBar() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(PrimaryRed)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            // Поисковая строка
            TextField(
                value = "",
                onValueChange = {},
                placeholder = { Text("Поиск товаров...", color = TextSecondary) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Поиск", tint = TextSecondary) },
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = SurfaceWhite,
                    unfocusedContainerColor = SurfaceWhite,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier
                    .weight(1f)
                    .height(50.dp)
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            // Иконка корзины
            IconButton(onClick = { /* TODO: Переход в корзину */ }) {
                Icon(
                    imageVector = Icons.Default.ShoppingCart,
                    contentDescription = "Корзина",
                    tint = SurfaceWhite
                )
            }
        }
    }
}

@Composable
fun CategorySection() {
    // Горизонтальный скролл с категориями (пока заглушка)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        val categories = listOf("Электроника", "Одежда", "Дом", "Авто", "Спорт")
        categories.forEach { category ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(LightRed),
                    contentAlignment = Alignment.Center
                ) {
                    // Здесь будет иконка или картинка категории
                    Text(category.first().toString(), color = PrimaryRed, fontWeight = FontWeight.Bold, fontSize = 24.sp)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = category, fontSize = 12.sp, color = TextMain)
            }
        }
    }
}

@Composable
fun ProductCard(product: Product, onProductClick: (Int) -> Unit = {}) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onProductClick(product.id) }
    ) {
        Column {
            // Заглушка для фото товара
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .background(Color(0xFFE0E0E0))
            )
            Column(modifier = Modifier.padding(8.dp)) {
                Text(
                    text = product.name,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    fontSize = 14.sp,
                    color = TextMain
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = product.price,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = PrimaryRed
                )
                Text(
                    text = if (product.isFreeShipping) "Бесплатная доставка" else "Доставка платная",
                    fontSize = 10.sp,
                    color = TextSecondary
                )
            }
        }
    }
}