import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // TO-DO
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer ID invalid');
    }

    const productsIds = products.map(product => {
      return { id: product.id };
    });

    const productsInfo = await this.productsRepository.findAllById(productsIds);

    if (!productsInfo || productsInfo.length !== products.length) {
      throw new AppError('productsInfo ID invalid');
    }

    products.forEach(productRecept => {
      productsInfo.forEach(productInfo => {
        if (
          productRecept.id === productInfo.id &&
          productRecept.quantity > productInfo.quantity
        ) {
          throw new AppError(
            `Product ${productRecept.id} without balance`,
            400,
          );
        }
      });
    });

    // console.log(newProduct);

    const productsToOrder = productsInfo.map(productInfo => {
      const productQuantity = products.find(
        productFind => productInfo.id === productFind.id,
      );

      return {
        product_id: productInfo.id,
        price: productInfo.price,
        quantity: productQuantity?.quantity || 0,
      };
    });

    const order = await this.ordersRepository.create({
      products: productsToOrder,
      customer,
    });

    // console.log(order);

    const productUpdateQuantity = products.map(productRecept => {
      const currentQuantityProduct = productsInfo.find(
        product => product.id === productRecept.id,
      );

      if (!currentQuantityProduct) {
        throw new Error('Error to find product');
      }

      return {
        id: currentQuantityProduct.id,
        quantity: currentQuantityProduct.quantity - productRecept.quantity,
      };
    });

    await this.productsRepository.updateQuantity(productUpdateQuantity);

    return order;
  }
}

export default CreateOrderService;
